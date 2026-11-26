import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import { Notification } from '../src/models/Notification.js';
import notificationService from '../src/services/notification.service.js';

describe('NotificationService', () => {
  test('broadcastSystemAnnouncement persists per-user notifications with valid _id and emits to user rooms', async () => {
    const origUserFind = User.find;
    const origInsertMany = Notification.insertMany;
    const origIo = notificationService.io;
    const emitted = [];

    notificationService.setIO({
      to(room) {
        return {
          emit(event, payload) {
            emitted.push({ room, event, payload });
          },
        };
      },
    });

    try {
      User.find = () => ({
        select() { return this; },
        async lean() { return [{ _id: 'u-1' }, { _id: 'u-2' }]; },
      });

      Notification.insertMany = async (docs) =>
        docs.map((d, idx) => ({
          ...d,
          _id: `notif-${idx + 1}`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }));

      const res = await notificationService.broadcastSystemAnnouncement({
        title: 'Maintenance',
        message: 'Window at midnight',
      });

      assert.equal(res.recipientCount, 2);
      const u1Notif = emitted.find((e) => e.room === 'user:u-1' && e.event === 'notification');
      assert.equal(u1Notif.payload._id, 'notif-1');
      assert.equal(u1Notif.payload.isRead, false);
    } finally {
      User.find = origUserFind;
      Notification.insertMany = origInsertMany;
      notificationService.setIO(origIo);
    }
  });
});
