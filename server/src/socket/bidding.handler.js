import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import notificationService from '../services/notification.service.js';

// In-memory rate limiting map: userId -> lastBidTimestamp (500ms cooldown)
const userLastBidMap = new Map();

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

  // Place a bid with atomic OCC validation and anti-sniping extension
  socket.on('place_bid', async (data) => {
    try {
      // 1. Guard against unauthenticated guest sockets
      if (!socket.userId || !socket.user) {
        return socket.emit('bid_rejected', {
          reason: 'Authentication required. Please sign in to place live bids.',
        });
      }

      const { auctionId, amount } = data || {};
      const numericAmount = Number(amount);

      if (!auctionId || isNaN(numericAmount) || numericAmount <= 0) {
        return socket.emit('bid_rejected', {
          reason: 'Valid auctionId and positive bid amount are required',
        });
      }

      const now = new Date();

      // 2. Throttle consecutive bids from the same user (500ms debounce)
      const lastBidTime = userLastBidMap.get(socket.userId) || 0;
      if (now.getTime() - lastBidTime < 500) {
        return socket.emit('bid_rejected', {
          reason: 'Please wait a moment before submitting another bid.',
        });
      }
      userLastBidMap.set(socket.userId, now.getTime());

      // Read current state of auction
      const currentAuction = await Auction.findById(auctionId);
      if (!currentAuction) {
        return socket.emit('bid_rejected', { reason: 'Auction not found' });
      }

      // Check seller cannot bid on their own auction
      if (currentAuction.sellerId.toString() === socket.userId) {
        return socket.emit('bid_rejected', {
          reason: 'You cannot bid on your own auction listing',
        });
      }

      // Check status
      if (currentAuction.status !== 'live' || new Date(currentAuction.endTime).getTime() <= now.getTime()) {
        return socket.emit('bid_rejected', { reason: 'Auction has ended' });
      }

      // Check bid amount is strictly greater than currentBid
      if (numericAmount <= currentAuction.currentBid) {
        return socket.emit('bid_rejected', {
          reason: `Bid must be greater than current bid ($${currentAuction.currentBid.toLocaleString()})`,
        });
      }

      // Check Anti-sniping: if bid placed with <= 30 seconds remaining, extend by 60 seconds
      const msRemaining = new Date(currentAuction.endTime).getTime() - now.getTime();
      const isAntiSnipingActive = msRemaining <= 30 * 1000 && msRemaining > 0;
      let newEndTime = currentAuction.endTime;

      if (isAntiSnipingActive) {
        newEndTime = new Date(new Date(currentAuction.endTime).getTime() + 60 * 1000);
      }

      // Atomic findOneAndUpdate with Optimistic Concurrency Control (OCC)
      const updateFilter = {
        _id: auctionId,
        version: currentAuction.version,
        currentBid: { $lt: numericAmount },
        status: 'live',
        endTime: { $gt: now },
      };

      const updateOp = {
        $set: {
          currentBid: numericAmount,
          highestBidderId: socket.userId,
          ...(isAntiSnipingActive ? { endTime: newEndTime } : {}),
        },
        $inc: {
          version: 1,
          bidCount: 1,
        },
      };

      const updatedAuction = await Auction.findOneAndUpdate(updateFilter, updateOp, {
        new: true,
      });

      if (!updatedAuction) {
        // Atomic OCC conflict or conditions no longer met
        const latestAuction = await Auction.findById(auctionId);
        if (!latestAuction || latestAuction.status !== 'live' || new Date(latestAuction.endTime).getTime() <= now.getTime()) {
          return socket.emit('bid_rejected', { reason: 'Auction has ended' });
        }
        if (numericAmount <= latestAuction.currentBid) {
          return socket.emit('bid_rejected', {
            reason: `Outbid! Current highest bid is now $${latestAuction.currentBid.toLocaleString()}`,
          });
        }
        return socket.emit('bid_rejected', {
          reason: 'A concurrent bid was accepted. Please refresh and try again.',
        });
      }

      // Insert record into bids collection
      await Bid.create({
        auctionId,
        bidderId: socket.userId,
        amount: numericAmount,
      });

      // Send outbid notification to previous highest bidder if one exists and is different from current bidder
      const previousHighestBidderId = currentAuction.highestBidderId;
      if (previousHighestBidderId && previousHighestBidderId.toString() !== socket.userId) {
        notificationService
          .sendNotification({
            userId: previousHighestBidderId,
            type: 'outbid',
            title: 'Outbid Alert',
            message: `You were outbid on "${currentAuction.title}". The new highest bid is $${updatedAuction.currentBid.toLocaleString()}.`,
            data: {
              auctionId: updatedAuction._id.toString(),
              auctionTitle: currentAuction.title,
              newBid: updatedAuction.currentBid,
            },
          })
          .catch((err) => console.error('Failed to send outbid notification:', err.message));
      }

      const secondsLeft = Math.max(0, Math.floor((new Date(updatedAuction.endTime).getTime() - Date.now()) / 1000));
      const roomName = `auction:${auctionId}`;

      // Emit bid_updated to everyone in the room
      io.to(roomName).emit('bid_updated', {
        auctionId: updatedAuction._id.toString(),
        currentBid: updatedAuction.currentBid,
        highestBidderId: socket.userId,
        bidderName: socket.user?.displayName || 'Bidder',
        bidCount: updatedAuction.bidCount,
        endTime: updatedAuction.endTime,
        secondsLeft,
      });

      // If anti-sniping extended the timer, broadcast updated time_remaining
      if (isAntiSnipingActive) {
        io.to(roomName).emit('time_remaining', {
          auctionId: updatedAuction._id.toString(),
          secondsLeft,
          antiSnipingExtended: true,
        });
      }
    } catch (err) {
      socket.emit('bid_rejected', {
        reason: err.message || 'Failed to place bid',
      });
    }
  });
}

export default registerBiddingHandlers;
