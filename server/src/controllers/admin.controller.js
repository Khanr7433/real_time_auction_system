import notificationService from '../services/notification.service.js';

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
  createAnnouncement,
};
