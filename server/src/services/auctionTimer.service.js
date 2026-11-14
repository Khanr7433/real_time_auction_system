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
    // Check every second for countdown sync and auto-closing expired auctions
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
    // 1. Guard against executing queries when MongoDB is not connected
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    // 2. Prevent concurrent / overlapping tick executions
    if (this.isTicking) {
      return;
    }

    this.isTicking = true;
    try {
      const now = new Date();

      // Find all live auctions
      const liveAuctions = await Auction.find({ status: 'live' });

      for (const auction of liveAuctions) {
        const auctionId = auction._id.toString();
        const roomName = `auction:${auctionId}`;
        const remainingSeconds = Math.max(
          0,
          Math.floor((new Date(auction.endTime).getTime() - now.getTime()) / 1000)
        );

        // 1. Broadcast time_remaining periodically to room
        if (this.io) {
          this.io.to(roomName).emit('time_remaining', {
            auctionId,
            secondsLeft: remainingSeconds,
          });
        }

        // 2. 5-minute warning (300 seconds)
        if (remainingSeconds <= 300 && remainingSeconds > 0 && !this.warningSent.has(auctionId)) {
          this.warningSent.add(auctionId);
          if (this.io) {
            this.io.to(roomName).emit('auction_ending_soon', {
              auctionId,
              secondsLeft: remainingSeconds,
              message: 'Auction will end in less than 5 minutes!',
            });
          }
        }

        // 3. Expiry check: if remainingSeconds === 0, close auction atomically
        if (remainingSeconds === 0) {
          await this.closeAuction(auction);
        }
      }
    } catch (err) {
      console.error('Error in AuctionTimerService tick:', err.message);
    } finally {
      this.isTicking = false;
    }
  }

  async closeAuction(auction) {
    try {
      const auctionId = auction._id.toString();
      const finalStatus = auction.bidCount > 0 ? 'completed' : 'unsold';

      // Atomically update status from 'live' to completed or unsold
      const updated = await Auction.findOneAndUpdate(
        { _id: auction._id, status: 'live' },
        { $set: { status: finalStatus } },
        { new: true }
      );

      if (updated) {
        console.log(`Auction ${auctionId} closed with status: ${finalStatus}`);
        this.warningSent.delete(auctionId);

        // Send auction outcome notifications
        if (updated.bidCount > 0 && updated.highestBidderId) {
          // Notify Winner
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

          // Notify Seller (Sold)
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
          // Notify Seller (Unsold)
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

