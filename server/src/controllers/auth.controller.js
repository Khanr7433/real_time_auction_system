import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken, invalidateToken } from '../utils/token.js';
import emailService from '../services/email.service.js';

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'If this email is registered, a password reset link has been sent.';

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, displayName, contactInfo } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (displayName !== undefined && typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name must be a string' });
    }
    if (contactInfo !== undefined && typeof contactInfo !== 'string') {
      return res.status(400).json({ error: 'Contact info must be a string' });
    }

    // Check duplicate email
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password & create user
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName?.trim() || normalizedEmail.split('@')[0],
      contactInfo: contactInfo?.trim() || '',
      role: 'user',
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Reject without revealing whether email, password, or suspension status matched
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const token = req.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (token) {
      invalidateToken(token);
    }

    return res.status(200).json({ message: 'Logout successful. Session invalidated.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await emailService.sendPasswordResetEmail({
      to: user.email,
      resetToken,
    });

    return res.status(200).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (typeof token !== 'string' || typeof newPassword !== 'string' || !token.trim() || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    // Hash new password, clear reset fields, and revoke existing sessions
    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.tokenVersion = (typeof user.tokenVersion === 'number' ? user.tokenVersion : 0) + 1;
    await user.save();

    const io = req.app?.get?.('io');
    if (io) {
      io.in(`user:${user._id.toString()}`).disconnectSockets(true);
    }

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

export {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
