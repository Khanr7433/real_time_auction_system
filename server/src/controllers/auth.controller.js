const crypto = require('crypto');
const User = require('../models/User');
const { generateToken, invalidateToken } = require('../utils/token');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, displayName, contactInfo } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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
      displayName: displayName || normalizedEmail.split('@')[0],
      contactInfo: contactInfo || '',
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

// Placeholders for subsequent tasks
// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Reject without revealing whether email or password was wrong
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Return 200 to prevent account enumeration, but don't leak token
      return res.status(200).json({ message: 'If this email is registered, a password reset link has been sent.' });
    }

    // Generate unhashed reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // In a production app, send email with resetToken.
    // For academic scope, return token in response for testing.
    return res.status(200).json({
      message: 'Password reset token generated successfully',
      resetToken, // for testing / development API simulation
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    // Hash new password and clear reset token fields
    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
