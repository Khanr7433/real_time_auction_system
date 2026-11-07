import { Notification } from '../models/Notification.js';

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

    // 1. Persist notification document in MongoDB
    const notification = await Notification.create({
      userId,
      type,
      title: title || '',
      message,
      data,
      isRead: false,
    });

    // 2. Deliver in real-time via user-specific socket room if Socket.io is initialized
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

      // Emit specific event type (e.g. outbid, auction_won, auction_sold, etc.)
      this.io.to(userRoom).emit(type, payload);

      // Also emit general 'notification' event for client notification centers
      this.io.to(userRoom).emit('notification', payload);
    }

    return notification;
  }

  /**
   * Broadcasts a system announcement to all connected sockets and optionally persists it.
   */
  async broadcastSystemAnnouncement({ title, message, data = {} }) {
    if (!message) {
      throw new Error('Message is required for system announcements');
    }

    const payload = {
      type: 'system_announcement',
      title: title || 'System Announcement',
      message,
      data,
      createdAt: new Date(),
    };

    if (this.io) {
      this.io.emit('system_announcement', payload);
      this.io.emit('notification', payload);
    }

    return payload;
  }
}

export const notificationService = new NotificationService();
export default notificationService;

