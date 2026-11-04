import { Auction } from '../models/Auction.js';

export function registerBiddingHandlers(io, socket) {
  // Join specific auction room
  socket.on('join_auction', async (data) => {
    try {
      const auctionId = typeof data === 'object' ? data?.auctionId : data;
      if (!auctionId) {
        return socket.emit('error', { message: 'auctionId is required to join an auction room' });
      }

      const auction = await Auction.findById(auctionId).lean();
      if (!auction) {
        return socket.emit('error', { message: 'Auction not found' });
      }

      const roomName = `auction:${auctionId}`;
      socket.join(roomName);

      const secondsLeft = Math.max(0, Math.floor((new Date(auction.endTime).getTime() - Date.now()) / 1000));

      // Emit current bid state and remaining time back to the joining client
      socket.emit('auction_state', {
        auctionId: auction._id.toString(),
        currentBid: auction.currentBid,
        highestBidderId: auction.highestBidderId ? auction.highestBidderId.toString() : null,
        bidCount: auction.bidCount,
        status: auction.status,
        endTime: auction.endTime,
        secondsLeft,
      });

      // Also emit time_remaining per design.md D6
      socket.emit('time_remaining', {
        auctionId: auction._id.toString(),
        secondsLeft,
      });
    } catch (err) {
      socket.emit('error', { message: err.message || 'Failed to join auction room' });
    }
  });

  // Leave specific auction room
  socket.on('leave_auction', (data) => {
    try {
      const auctionId = typeof data === 'object' ? data?.auctionId : data;
      if (auctionId) {
        const roomName = `auction:${auctionId}`;
        socket.leave(roomName);
      }
    } catch (err) {
      // Ignore leave error
    }
  });
}

export default registerBiddingHandlers;
