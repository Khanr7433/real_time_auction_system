import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import emailService from '../src/services/email.service.js';

describe('EmailService', () => {
  test('sendPasswordResetEmail sends reset link with encoded token via transport', async () => {
    const sentMessages = [];
    emailService.setTransport({
      async sendMail(mail) {
        sentMessages.push(mail);
        return { messageId: 'msg-123' };
      },
    });

    try {
      const result = await emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        resetToken: 'abc+123',
      });

      assert.equal(result.delivered, true);
      assert.equal(result.messageId, 'msg-123');
      assert.equal(sentMessages.length, 1);
      assert.equal(sentMessages[0].to, 'user@example.com');
      assert.match(sentMessages[0].text, /\/forgot-password\?token=abc%2B123/);
      assert.match(sentMessages[0].html, /\/forgot-password\?token=abc%2B123/);
    } finally {
      emailService.setTransport(null);
    }
  });

  test('sendPasswordResetEmail rejects missing recipient or token', async () => {
    await assert.rejects(
      () => emailService.sendPasswordResetEmail({ to: '', resetToken: 'abc' }),
      /Recipient email and resetToken are required/
    );
  });
});
