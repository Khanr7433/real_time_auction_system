import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import User from '../models/User.js';
import notificationService from '../services/notification.service.js';
import { isTokenInvalidated } from '../utils/token.js';
import { isValidObjectId, maskDisplayName } from '../utils/validation.js';

const BID_COOLDOWN_MS = 500;
const MAX_BID_AMOUNT = 1_000_000_000;

// In-memory rate limiting map: userId -> lastBidTimestamp (500ms cooldown)
const userLastBidMap = new Map();

function pruneUserLastBidMap(nowMs) {
  for (const [uid, ts] of userLastBidMap.entries()) {
    if (nowMs - ts >= BID_COOLDOWN_MS) {
      userLastBidMap.delete(uid);
    }
  }
}

export function registerBiddingHandlers(io, socket) {
  // Join specific auction room
  socket.on('join_auction', async (data) => {
    try {
      const auctionId = typeof data === 'object' ? data?.auctionId : data;
      if (!isValidObjectId(auctionId)) {
        return socket.emit('error', { message: 'Valid auctionId is required to join an auction room' });
      }

      const auction = await Auction.findById(auctionId).lean();
      if (!auction) {
        return socket.emit('error', { message: 'Auction not found' });
      }

      const roomName = `auction:${auctionId}`;
      socket.join(roomName);

      const secondsLeft = Math.max(0, Math.ceil((new Date(auction.endTime).getTime() - Date.now()) / 1000));

      socket.emit('auction_state', {
        auctionId: auction._id.toString(),
        currentBid: auction.currentBid,
        highestBidderId: auction.highestBidderId ? auction.highestBidderId.toString() : null,
        bidCount: auction.bidCount,
        status: auction.status,
        endTime: auction.endTime,
        secondsLeft,
      });

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
    } catch {
      // Ignore leave error
    }
  });

  // Place a bid with atomic OCC validation and anti-sniping extension
  socket.on('place_bid', async (data) => {
    try {
      if (!socket.userId || !socket.user) {
        return socket.emit('bid_rejected', {
          reason: 'Authentication required. Please sign in to place live bids.',
        });
      }

      if (socket.handshakeToken && isTokenInvalidated(socket.handshakeToken)) {
        socket.disconnect(true);
        return socket.emit('bid_rejected', {
          reason: 'Session has been invalidated. Please sign in again.',
        });
      }

      // Re-verify live suspension & tokenVersion state on active sockets
      const liveUser = await User.findById(socket.userId).select('isSuspended tokenVersion').lean();
      if (!liveUser || liveUser.isSuspended) {
        socket.disconnect(true);
        return socket.emit('bid_rejected', {
          reason: 'Your account is suspended or unavailable.',
        });
      }

      const socketVersion = typeof socket.user.tokenVersion === 'number' ? socket.user.tokenVersion : 0;
      const dbVersion = typeof liveUser.tokenVersion === 'number' ? liveUser.tokenVersion : 0;
      if (socketVersion !== dbVersion) {
        socket.disconnect(true);
        return socket.emit('bid_rejected', {
          reason: 'Session expired. Please sign in again.',
        });
      }

      const { auctionId, amount } = data || {};
      const numericAmount = Number(amount);

      if (
        !isValidObjectId(auctionId) ||
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0 ||
        numericAmount > MAX_BID_AMOUNT ||
        Math.round(numericAmount * 100) !== numericAmount * 100
      ) {
        return socket.emit('bid_rejected', {
          reason: 'Valid auctionId and finite bid amount (max 2 decimals) are required',
        });
      }

      const now = new Date();
      const nowMs = now.getTime();
      pruneUserLastBidMap(nowMs);

      const lastBidTime = userLastBidMap.get(socket.userId) || 0;
      if (nowMs - lastBidTime < BID_COOLDOWN_MS) {
        return socket.emit('bid_rejected', {
          reason: 'Please wait a moment before submitting another bid.',
        });
      }
      userLastBidMap.set(socket.userId, nowMs);

      const currentAuction = await Auction.findById(auctionId);
      if (!currentAuction) {
        return socket.emit('bid_rejected', { reason: 'Auction not found' });
      }

      if (currentAuction.sellerId.toString() === socket.userId) {
        return socket.emit('bid_rejected', {
          reason: 'You cannot bid on your own auction listing',
        });
      }

      if (currentAuction.highestBidderId && currentAuction.highestBidderId.toString() === socket.userId) {
        return socket.emit('bid_rejected', {
          reason: 'You are already the highest bidder on this auction.',
        });
      }

      if (currentAuction.status !== 'live' || new Date(currentAuction.endTime).getTime() <= nowMs) {
        return socket.emit('bid_rejected', { reason: 'Auction has ended' });
      }

      const minRequiredBid = currentAuction.currentBid + 1;
      if (numericAmount < minRequiredBid) {
        return socket.emit('bid_rejected', {
          reason: `Bid must be at least $${minRequiredBid.toLocaleString()}`,
        });
      }

      const msRemaining = new Date(currentAuction.endTime).getTime() - nowMs;
      const isAntiSnipingActive = msRemaining <= 30 * 1000 && msRemaining > 0;
      const newEndTime = isAntiSnipingActive
        ? new Date(new Date(currentAuction.endTime).getTime() + 60 * 1000)
        : currentAuction.endTime;

      const updateFilter = {
        _id: auctionId,
        version: currentAuction.version,
        currentBid: { $lte: numericAmount - 1 },
        highestBidderId: { $ne: socket.userId },
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
        const latestAuction = await Auction.findById(auctionId);
        if (!latestAuction || latestAuction.status !== 'live' || new Date(latestAuction.endTime).getTime() <= nowMs) {
          return socket.emit('bid_rejected', { reason: 'Auction has ended' });
        }
        if (latestAuction.highestBidderId && latestAuction.highestBidderId.toString() === socket.userId) {
          return socket.emit('bid_rejected', {
            reason: 'You are already the highest bidder on this auction.',
          });
        }
        if (numericAmount < latestAuction.currentBid + 1) {
          return socket.emit('bid_rejected', {
            reason: `Outbid! Current highest bid is now $${latestAuction.currentBid.toLocaleString()}`,
          });
        }
        return socket.emit('bid_rejected', {
          reason: 'A concurrent bid was accepted. Please refresh and try again.',
        });
      }

      try {
        await Bid.create({
          auctionId,
          bidderId: socket.userId,
          amount: numericAmount,
        });
      } catch (bidErr) {
        // Roll back auction state if Bid ledger insert fails
        await Auction.findOneAndUpdate(
          { _id: auctionId, version: updatedAuction.version },
          {
            $set: {
              currentBid: currentAuction.currentBid,
              highestBidderId: currentAuction.highestBidderId,
              endTime: currentAuction.endTime,
            },
            $inc: {
              version: 1,
              bidCount: -1,
            },
          }
        ).catch(() => {});

        return socket.emit('bid_rejected', {
          reason: 'Failed to record bid. Please try again.',
        });
      }

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

      const secondsLeft = Math.max(0, Math.ceil((new Date(updatedAuction.endTime).getTime() - Date.now()) / 1000));
      const roomName = `auction:${auctionId}`;

      io.to(roomName).emit('bid_updated', {
        auctionId: updatedAuction._id.toString(),
        currentBid: updatedAuction.currentBid,
        highestBidderId: socket.userId,
        bidderName: maskDisplayName(socket.user?.displayName),
        bidCount: updatedAuction.bidCount,
        endTime: updatedAuction.endTime,
        secondsLeft,
      });

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

export { userLastBidMap };
export default registerBiddingHandlers;
