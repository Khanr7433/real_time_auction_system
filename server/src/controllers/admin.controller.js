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
  createAnnouncement,
};

