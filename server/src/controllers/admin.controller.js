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
  createAnnouncement,
};

