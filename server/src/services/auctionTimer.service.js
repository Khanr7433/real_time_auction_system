import mongoose from 'mongoose';
import { Auction } from '../models/Auction.js';
import notificationService from './notification.service.js';

class AuctionTimerService {
  constructor() {
    this.io = null;
    this.intervalId = null;
    this.isTicking = false;
    this.warningSent = new Set(); // Track auctions that already received 5-min warning
  }

  init(io) {
    this.io = io;
    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.tick(), 1000);
      console.log('Auction Timer Service initialized (1s resolution)');
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async tick() {
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    if (this.isTicking) {
      return;
    }

    this.isTicking = true;
    try {
      const now = new Date();

      const query = Auction.find({ status: 'live' });
      const liveAuctions =
        query && typeof query.select === 'function'
          ? await query
              .select('_id endTime status bidCount highestBidderId currentBid sellerId title')
              .lean()
          : await query;

      for (const auction of liveAuctions) {
        const auctionId = auction._id.toString();
        const roomName = `auction:${auctionId}`;
        const msRemaining = new Date(auction.endTime).getTime() - now.getTime();
        const remainingSeconds = Math.max(0, Math.ceil(msRemaining / 1000));

        if (this.io) {
          this.io.to(roomName).emit('time_remaining', {
            auctionId,
            secondsLeft: remainingSeconds,
          });
        }

        if (remainingSeconds <= 300 && remainingSeconds > 0 && !this.warningSent.has(auctionId)) {
          this.warningSent.add(auctionId);
          if (this.io) {
            this.io.to(roomName).emit('auction_ending_soon', {
              auctionId,
              secondsLeft: remainingSeconds,
              message: 'Auction will end in less than 5 minutes!',
              data: {
                auctionId,
                secondsLeft: remainingSeconds,
              },
            });
          }
        }

        // Only close once endTime has genuinely elapsed
        if (msRemaining <= 0) {
          await this.closeAuction(auction, now);
        }
      }
    } catch (err) {
      console.error('Error in AuctionTimerService tick:', err.message);
    } finally {
      this.isTicking = false;
    }
  }

  async closeAuction(auction, now = new Date()) {
    try {
      const auctionId = auction._id.toString();

      // Atomically resolve completed vs unsold using committed DB bidCount and endTime <= now
      let updated = await Auction.findOneAndUpdate(
        { _id: auction._id, status: 'live', endTime: { $lte: now }, bidCount: { $gt: 0 } },
        { $set: { status: 'completed' } },
        { new: true }
      );

      if (!updated) {
        updated = await Auction.findOneAndUpdate(
          { _id: auction._id, status: 'live', endTime: { $lte: now }, bidCount: 0 },
          { $set: { status: 'unsold' } },
          { new: true }
        );
      }

      if (updated) {
        const finalStatus = updated.status;
        console.log(`Auction ${auctionId} closed with status: ${finalStatus}`);
        this.warningSent.delete(auctionId);

        if (updated.bidCount > 0 && updated.highestBidderId) {
          notificationService
            .sendNotification({
              userId: updated.highestBidderId,
              type: 'auction_won',
              title: 'Auction Won!',
              message: `Congratulations! You won "${updated.title}" with a final bid of $${updated.currentBid.toLocaleString()}.`,
              data: {
                auctionId,
                auctionTitle: updated.title,
                finalPrice: updated.currentBid,
                sellerId: updated.sellerId ? updated.sellerId.toString() : null,
              },
            })
            .catch((err) => console.error('Failed to send auction_won notification:', err.message));

          if (updated.sellerId) {
            notificationService
              .sendNotification({
                userId: updated.sellerId,
                type: 'auction_sold',
                title: 'Listing Sold!',
                message: `Your item "${updated.title}" sold for $${updated.currentBid.toLocaleString()}!`,
                data: {
                  auctionId,
                  auctionTitle: updated.title,
                  finalPrice: updated.currentBid,
                  winnerId: updated.highestBidderId ? updated.highestBidderId.toString() : null,
                },
              })
              .catch((err) => console.error('Failed to send auction_sold notification:', err.message));
          }
        } else if (updated.sellerId) {
          notificationService
            .sendNotification({
              userId: updated.sellerId,
              type: 'auction_unsold',
              title: 'Listing Ended (Unsold)',
              message: `Your item "${updated.title}" ended with no bids placed.`,
              data: {
                auctionId,
                auctionTitle: updated.title,
              },
            })
            .catch((err) => console.error('Failed to send auction_unsold notification:', err.message));
        }

        if (this.io) {
          const roomName = `auction:${auctionId}`;
          this.io.to(roomName).emit('auction_ended', {
            auctionId,
            status: finalStatus,
            winnerId: updated.highestBidderId ? updated.highestBidderId.toString() : null,
            finalBid: updated.currentBid,
            bidCount: updated.bidCount,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to close auction ${auction._id}:`, err.message);
    }
  }
}

export const auctionTimerService = new AuctionTimerService();
export default auctionTimerService;
