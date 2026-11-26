import notificationService from '../services/notification.service.js';
import auctionTimerService from '../services/auctionTimer.service.js';
import User from '../models/User.js';
import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { Dispute } from '../models/Dispute.js';
import {
  cleanupStoredImages,
  escapeRegex,
  isValidObjectId,
} from '../utils/validation.js';

const VALID_USER_ROLES = new Set(['user', 'admin']);
const VALID_AUCTION_STATUSES = new Set(['pending', 'live', 'completed', 'unsold', 'admin-terminated']);
const VALID_DISPUTE_STATUSES = new Set(['open', 'resolved', 'dismissed']);
const VALID_RESOLUTION_STATUSES = new Set(['resolved', 'dismissed']);

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
      User.countDocuments({ isSuspended: false }),
      User.countDocuments({}),
      Auction.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
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
      Dispute.countDocuments({ status: 'open' }),
    ]);

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
        pending: auctions.pending,
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

    const escaped = escapeRegex(req.query.search);
    if (escaped) {
      filter.$or = [
        { email: { $regex: escaped, $options: 'i' } },
        { displayName: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (req.query.role) {
      if (!VALID_USER_ROLES.has(req.query.role)) {
        return res.status(400).json({ error: 'Invalid role filter' });
      }
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

// PATCH /api/admin/users/:id/suspend - Suspend user, increment tokenVersion, and disconnect active sockets
export async function suspendUser(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot suspend your own admin account' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isSuspended: true }, $inc: { tokenVersion: 1 } },
      { new: true }
    ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const io = req.app?.get?.('io');
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }

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

// GET /api/admin/auctions - List auctions with status filter, seller-aware search, and pagination
export async function getAdminAuctions(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && req.query.status !== 'all') {
      if (!VALID_AUCTION_STATUSES.has(req.query.status)) {
        return res.status(400).json({ error: 'Invalid auction status filter' });
      }
      filter.status = req.query.status;
    }

    if (req.query.flagged === 'true') {
      filter.isFlagged = true;
    }

    const escaped = escapeRegex(req.query.search);
    if (escaped) {
      const matchingSellers = await User.find({
        $or: [
          { email: { $regex: escaped, $options: 'i' } },
          { displayName: { $regex: escaped, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();

      const sellerIds = matchingSellers.map((s) => s._id);
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        ...(sellerIds.length > 0 ? [{ sellerId: { $in: sellerIds } }] : []),
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
      timeRemainingSeconds: Math.max(0, Math.ceil((new Date(a.endTime).getTime() - Date.now()) / 1000)),
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

// DELETE /api/admin/auctions/:id - Admin remove auction, cleanup bids/media, and notify seller
export async function deleteAdminAuction(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const rawReason = req.body?.reason ?? req.query?.reason;
    const reasonText =
      typeof rawReason === 'string' && rawReason.trim()
        ? rawReason.trim()
        : 'Violation of platform guidelines';

    const deleted = await Auction.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    await Bid.deleteMany({ auctionId: id });
    cleanupStoredImages(deleted.images);
    auctionTimerService.warningSent.delete(id);

    if (deleted.sellerId) {
      notificationService
        .sendNotification({
          userId: deleted.sellerId,
          type: 'system',
          title: 'Listing Removed by Moderator',
          message: `Your listing "${deleted.title}" was removed by an administrator. Reason: ${reasonText}.`,
          data: { auctionId: id, auctionTitle: deleted.title },
        })
        .catch((err) => console.error('Failed to notify seller of removal:', err.message));
    }

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction_ended', {
        auctionId: id,
        status: 'admin-terminated',
        winnerId: null,
        finalBid: deleted.currentBid,
        reason: reasonText,
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const { isFlagged = true, reason = '' } = req.body || {};
    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({ error: 'Flag reason must be a string' });
    }

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
      message: Boolean(isFlagged) ? 'Auction flagged for review' : 'Auction unflagged',
      auction,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update auction flag status' });
  }
}

// POST /api/admin/auctions/:id/terminate - Atomically force-terminate active auction
export async function terminateAuction(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const rawReason = req.body?.reason;
    const reasonText =
      typeof rawReason === 'string' && rawReason.trim()
        ? rawReason.trim()
        : 'Terminated by administrator';

    const updated = await Auction.findOneAndUpdate(
      { _id: id, status: 'live' },
      { $set: { status: 'admin-terminated' } },
      { new: true }
    );

    if (!updated) {
      const existing = await Auction.findById(id).select('status').lean();
      if (!existing) {
        return res.status(404).json({ error: 'Auction not found' });
      }
      return res.status(400).json({ error: `Cannot terminate auction with status "${existing.status}"` });
    }

    auctionTimerService.warningSent.delete(id);

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction_ended', {
        auctionId: id,
        status: 'admin-terminated',
        winnerId: null,
        finalBid: updated.currentBid,
        reason: reasonText,
      });
    }

    if (updated.sellerId) {
      notificationService
        .sendNotification({
          userId: updated.sellerId,
          type: 'system',
          title: 'Auction Force-Terminated',
          message: `Your active auction "${updated.title}" was terminated by an administrator. Reason: ${reasonText}.`,
          data: { auctionId: id, auctionTitle: updated.title },
        })
        .catch((err) => console.error('Failed to notify seller of termination:', err.message));
    }

    return res.status(200).json({
      message: 'Auction force-terminated successfully',
      auction: updated,
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
      if (!VALID_DISPUTE_STATUSES.has(req.query.status)) {
        return res.status(400).json({ error: 'Invalid dispute status filter' });
      }
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

// PATCH /api/admin/disputes/:id/resolve - Atomically resolve or dismiss an open dispute
export async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid dispute identifier' });
    }

    const { resolutionNote, status = 'resolved' } = req.body || {};
    if (typeof status !== 'string' || !VALID_RESOLUTION_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Resolution status must be "resolved" or "dismissed"' });
    }
    if (resolutionNote !== undefined && typeof resolutionNote !== 'string') {
      return res.status(400).json({ error: 'Resolution note must be a string' });
    }

    const note = resolutionNote?.trim() || 'Resolved by administrator';

    const dispute = await Dispute.findOneAndUpdate(
      { _id: id, status: 'open' },
      {
        $set: {
          status,
          resolutionNote: note,
          resolvedAt: new Date(),
        },
      },
      { new: true }
    ).populate('auctionId', 'title');

    if (!dispute) {
      const existing = await Dispute.findById(id).select('status').lean();
      if (!existing) {
        return res.status(404).json({ error: 'Dispute not found' });
      }
      return res.status(400).json({ error: `Dispute is already ${existing.status}` });
    }

    const auctionTitle = dispute.auctionId?.title || 'the referenced listing';

    if (dispute.reporterId) {
      notificationService
        .sendNotification({
          userId: dispute.reporterId,
          type: 'system',
          title: 'Dispute Resolved',
          message: `Your dispute regarding "${auctionTitle}" has been ${status}. Note: "${note}"`,
          data: { disputeId: id, resolutionNote: note },
        })
        .catch((err) => console.error('Failed to notify reporter:', err.message));
    }

    if (dispute.reportedUserId) {
      notificationService
        .sendNotification({
          userId: dispute.reportedUserId,
          type: 'system',
          title: 'Dispute Resolved',
          message: `The dispute involving "${auctionTitle}" has been closed (${status}) with note: "${note}"`,
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
    const { title, message } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Announcement message is required' });
    }
    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({ error: 'Announcement title must be a string' });
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
