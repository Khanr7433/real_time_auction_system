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
const login = async (req, res, next) => {
  res.status(501).json({ error: 'Not implemented' });
};

const logout = async (req, res, next) => {
  res.status(501).json({ error: 'Not implemented' });
};

const forgotPassword = async (req, res, next) => {
  res.status(501).json({ error: 'Not implemented' });
};

const resetPassword = async (req, res, next) => {
  res.status(501).json({ error: 'Not implemented' });
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
