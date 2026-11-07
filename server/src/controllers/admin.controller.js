import notificationService from '../services/notification.service.js';
import User from '../models/User.js';
import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { Dispute } from '../models/Dispute.js';

// GET /api/admin/analytics - Platform analytics using MongoDB aggregation
export async function getAnalytics(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeUserCount,
      totalUserCount,
      auctionCountsByStatus,
      thirtyDayBidStats,
      openDisputeCount,
    ] = await Promise.all([
      // 1. Active (non-suspended) users
      User.countDocuments({ isSuspended: false }),
      // Total registered users
      User.countDocuments({}),
      // 2. Auctions breakdown by status
      Auction.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      // 3. 30-day bid volume and count
      Bid.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalBids: { $sum: 1 },
          },
        },
      ]),
      // 4. Open disputes
      Dispute.countDocuments({ status: 'open' }),
    ]);

    // Format auction breakdown
    const auctions = {
      live: 0,
      completed: 0,
      unsold: 0,
      'admin-terminated': 0,
      pending: 0,
      total: 0,
    };

    auctionCountsByStatus.forEach((item) => {
      if (item._id) {
        auctions[item._id] = item.count;
        auctions.total += item.count;
      }
    });

    const bidStats = thirtyDayBidStats[0] || { totalVolume: 0, totalBids: 0 };

    return res.status(200).json({
      users: {
        active: activeUserCount,
        total: totalUserCount,
        suspended: totalUserCount - activeUserCount,
      },
      auctions: {
        live: auctions.live,
        completed: auctions.completed,
        unsold: auctions.unsold,
        terminated: auctions['admin-terminated'],
        total: auctions.total,
      },
      bids: {
        thirtyDayVolume: bidStats.totalVolume,
        thirtyDayCount: bidStats.totalBids,
      },
      disputes: {
        open: openDisputeCount,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve analytics' });
  }
}

// GET /api/admin/users - Search and list users with pagination
export async function getUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      filter.$or = [
        { email: { $regex: term, $options: 'i' } },
        { displayName: { $regex: term, $options: 'i' } },
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status === 'suspended') {
      filter.isSuspended = true;
    } else if (req.query.status === 'active') {
      filter.isSuspended = false;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
}

// PATCH /api/admin/users/:id/suspend - Suspend user and disconnect active sockets
export async function suspendUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot suspend your own admin account' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isSuspended: true } },
      { new: true }
    ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Force disconnect all active sockets belonging to this user
    const io = req.app.get('io');
    if (io) {
      io.in(`user:${id}`).disconnectSockets(true);
    }

    return res.status(200).json({
      message: 'User account has been suspended successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to suspend user' });
  }
}

// PATCH /api/admin/users/:id/reactivate - Reactivate suspended user
export async function reactivateUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isSuspended: false } },
      { new: true }
    ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User account has been reactivated successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to reactivate user' });
  }
}

// GET /api/admin/auctions - List auctions with status filter and pagination
export async function getAdminAuctions(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.flagged === 'true') {
      filter.isFlagged = true;
    }

    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate('sellerId', 'displayName email avatar')
        .populate('highestBidderId', 'displayName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Auction.countDocuments(filter),
    ]);

    const enriched = auctions.map((a) => ({
      ...a,
      timeRemainingSeconds: Math.max(0, Math.floor((new Date(a.endTime).getTime() - Date.now()) / 1000)),
    }));

    return res.status(200).json({
      auctions: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch admin auctions' });
  }
}

// DELETE /api/admin/auctions/:id - Admin remove auction and notify seller
export async function deleteAdminAuction(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const sellerId = auction.sellerId;
    const auctionTitle = auction.title;

    await Auction.findByIdAndDelete(id);

    // Notify seller
    if (sellerId) {
      notificationService
        .sendNotification({
          userId: sellerId,
          type: 'system',
          title: 'Listing Removed by Moderator',
          message: `Your listing "${auctionTitle}" was removed by an administrator. Reason: ${
            reason || 'Violation of platform guidelines'
          }.`,
          data: { auctionId: id, auctionTitle },
        })
        .catch((err) => console.error('Failed to notify seller of removal:', err.message));
    }

    // Broadcast room closure if live
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction_ended', {
        auctionId: id,
        status: 'admin-terminated',
        reason: 'Auction removed by administrator',
      });
    }

    return res.status(200).json({
      message: 'Auction removed successfully and seller notified',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to remove auction' });
  }
}

// PATCH /api/admin/auctions/:id/flag - Flag or unflag auction for review
export async function flagAuction(req, res) {
  try {
    const { id } = req.params;
    const { isFlagged = true, reason = '' } = req.body;

    const auction = await Auction.findByIdAndUpdate(
      id,
      {
        $set: {
          isFlagged: Boolean(isFlagged),
          flagReason: reason.trim(),
        },
      },
      { new: true }
    );

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    return res.status(200).json({
      message: isFlagged ? 'Auction flagged for review' : 'Auction unflagged',
      auction,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update auction flag status' });
  }
}

// POST /api/admin/auctions/:id/terminate - Force-terminate active auction
export async function terminateAuction(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'live') {
      return res.status(400).json({ error: `Cannot terminate auction with status "${auction.status}"` });
    }

    auction.status = 'admin-terminated';
    await auction.save();

    // Broadcast to room that auction was terminated
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction_ended', {
        auctionId: id,
        status: 'admin-terminated',
        winnerId: null,
        finalBid: auction.currentBid,
        reason: reason || 'Terminated by administrator',
      });
    }

    // Notify seller
    if (auction.sellerId) {
      notificationService
        .sendNotification({
          userId: auction.sellerId,
          type: 'system',
          title: 'Auction Force-Terminated',
          message: `Your active auction "${auction.title}" was terminated by an administrator. Reason: ${
            reason || 'Administrative action'
          }.`,
          data: { auctionId: id, auctionTitle: auction.title },
        })
        .catch((err) => console.error('Failed to notify seller of termination:', err.message));
    }

    return res.status(200).json({
      message: 'Auction force-terminated successfully',
      auction,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to terminate auction' });
  }
}

// GET /api/admin/disputes - List disputes with status filter and pagination
export async function getAdminDisputes(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('reporterId', 'displayName email avatar')
        .populate('reportedUserId', 'displayName email avatar')
        .populate('auctionId', 'title currentBid status sellerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dispute.countDocuments(filter),
    ]);

    return res.status(200).json({
      disputes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch disputes' });
  }
}

// PATCH /api/admin/disputes/:id/resolve - Mark dispute resolved with note and notify parties
export async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { resolutionNote, status = 'resolved' } = req.body;

    const dispute = await Dispute.findById(id).populate('auctionId', 'title');
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    dispute.status = status;
    dispute.resolutionNote = resolutionNote?.trim() || 'Resolved by administrator';
    dispute.resolvedAt = new Date();
    await dispute.save();

    const note = dispute.resolutionNote;
    const auctionTitle = dispute.auctionId?.title || 'the referenced listing';

    // 1. Notify reporter
    if (dispute.reporterId) {
      notificationService
        .sendNotification({
          userId: dispute.reporterId,
          type: 'system',
          title: 'Dispute Resolved',
          message: `Your dispute regarding "${auctionTitle}" has been resolved. Note: "${note}"`,
          data: { disputeId: id, resolutionNote: note },
        })
        .catch((err) => console.error('Failed to notify reporter:', err.message));
    }

    // 2. Notify reported user if applicable
    if (dispute.reportedUserId) {
      notificationService
        .sendNotification({
          userId: dispute.reportedUserId,
          type: 'system',
          title: 'Dispute Resolved',
          message: `The dispute involving "${auctionTitle}" has been closed with resolution: "${note}"`,
          data: { disputeId: id, resolutionNote: note },
        })
        .catch((err) => console.error('Failed to notify reported user:', err.message));
    }

    return res.status(200).json({
      message: 'Dispute updated and parties notified successfully',
      dispute,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to resolve dispute' });
  }
}

// POST /api/admin/announcements - Broadcast a system announcement
export async function createAnnouncement(req, res) {
  try {
    const { title, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Announcement message is required' });
    }

    const payload = await notificationService.broadcastSystemAnnouncement({
      title: title?.trim() || 'System Announcement',
      message: message.trim(),
      data: {
        adminId: req.user._id.toString(),
        adminName: req.user.displayName || 'Administrator',
      },
    });

    return res.status(201).json({
      message: 'System announcement broadcast successfully to all connected users',
      announcement: payload,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to broadcast announcement' });
  }
}

export default {
  getAnalytics,
  getUsers,
  suspendUser,
  reactivateUser,
  getAdminAuctions,
  deleteAdminAuction,
  flagAuction,
  terminateAuction,
  getAdminDisputes,
  resolveDispute,
  createAnnouncement,
};

