import { Notification } from '../models/Notification.js';
import User from '../models/User.js';

class NotificationService {
  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
  }

  setIO(io) {
    this.io = io;
  }

  /**
   * Persists a notification to MongoDB and delivers it via WebSocket if the user is connected.
   */
  async sendNotification({ userId, type, title, message, data = {} }) {
    if (!userId || !type || !message) {
      throw new Error('userId, type, and message are required for notifications');
    }

    const notification = await Notification.create({
      userId,
      type,
      title: title || '',
      message,
      data,
      isRead: false,
    });

    if (this.io) {
      const userRoom = `user:${userId.toString()}`;
      const payload = {
        _id: notification._id.toString(),
        userId: userId.toString(),
        type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: false,
        createdAt: notification.createdAt,
      };

      this.io.to(userRoom).emit(type, payload);
      this.io.to(userRoom).emit('notification', payload);
    }

    return notification;
  }

  /**
   * Persists per-user system announcements in MongoDB and delivers them via WebSocket.
   */
  async broadcastSystemAnnouncement({ title, message, data = {} }) {
    if (!message) {
      throw new Error('Message is required for system announcements');
    }

    const normalizedTitle = title || 'System Announcement';
    const activeUsers = await User.find({ isSuspended: false }).select('_id').lean();

    let insertedNotifications = [];
    if (Array.isArray(activeUsers) && activeUsers.length > 0) {
      const docs = activeUsers.map((u) => ({
        userId: u._id,
        type: 'system_announcement',
        title: normalizedTitle,
        message,
        data,
        isRead: false,
      }));
      insertedNotifications = await Notification.insertMany(docs);
    }

    if (this.io) {
      for (const notif of insertedNotifications) {
        const uid = notif.userId.toString();
        const payload = {
          _id: notif._id.toString(),
          userId: uid,
          type: 'system_announcement',
          title: notif.title,
          message: notif.message,
          data: notif.data,
          isRead: false,
          createdAt: notif.createdAt,
        };
        const userRoom = `user:${uid}`;
        this.io.to(userRoom).emit('system_announcement', payload);
        this.io.to(userRoom).emit('notification', payload);
      }
    }

    return {
      type: 'system_announcement',
      title: normalizedTitle,
      message,
      data,
      recipientCount: insertedNotifications.length,
      createdAt: new Date(),
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
