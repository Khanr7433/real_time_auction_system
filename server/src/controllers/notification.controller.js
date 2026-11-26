import { Notification } from '../models/Notification.js';
import { isValidObjectId } from '../utils/validation.js';

// GET /api/notifications - Get paginated notifications for current user
export async function getNotifications(req, res) {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return res.status(200).json({
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
}

// PATCH /api/notifications/:id/read - Mark a notification as read
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid notification identifier' });
    }
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
}

// PATCH /api/notifications/read-all - Mark all notifications as read for current user
export async function markAllAsRead(req, res) {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });

    return res.status(200).json({
      message: 'All notifications marked as read',
      unreadCount: 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
}

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

