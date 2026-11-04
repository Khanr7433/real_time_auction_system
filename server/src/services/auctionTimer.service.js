import { Auction } from '../models/Auction.js';

class AuctionTimerService {
  constructor() {
    this.io = null;
    this.intervalId = null;
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
