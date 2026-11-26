import nodemailer from 'nodemailer';
import config from '../config/index.js';

class EmailService {
  constructor() {
    this.customTransport = null;
  }

  /**
   * Override transport (primarily for unit/integration testing).
   */
  setTransport(transport) {
    this.customTransport = transport;
  }

  createTransport() {
    if (this.customTransport) {
      return this.customTransport;
    }

    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS || '',
            }
          : undefined,
      });
    }

    if (process.env.NODE_ENV === 'test') {
      return nodemailer.createTransport({ jsonTransport: true });
    }

    return null;
  }

  /**
   * Sends a password reset email containing a 1-hour reset link.
   */
  async sendPasswordResetEmail({ to, resetToken }) {
    if (!to || !resetToken) {
      throw new Error('Recipient email and resetToken are required');
    }

    const baseUrl = (config.clientUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/forgot-password?token=${encodeURIComponent(resetToken)}`;
    const from = process.env.EMAIL_FROM || 'BidNow <no-reply@bidnow.local>';

    const transport = this.createTransport();
    if (!transport) {
      console.warn('[EmailService] SMTP_HOST is not configured; password reset email was not dispatched.');
      return { delivered: false, reason: 'smtp_not_configured' };
    }

    const info = await transport.sendMail({
      from,
      to,
      subject: 'Reset your BidNow password',
      text: [
        'We received a request to reset your BidNow password.',
        `Reset your password using this link (valid for 1 hour): ${resetUrl}`,
        `Or paste this reset token in the app: ${resetToken}`,
        'If you did not request a password reset, you can safely ignore this email.',
      ].join('\n\n'),
      html: `
        <p>We received a request to reset your BidNow password.</p>
        <p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour).</p>
        <p>If the link does not open, paste this token in the password reset form:</p>
        <pre>${resetToken}</pre>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
    });

    return { delivered: true, messageId: info?.messageId || null };
  }
}

export const emailService = new EmailService();
export default emailService;
