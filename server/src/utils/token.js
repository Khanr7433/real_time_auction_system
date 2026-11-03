const jwt = require('jsonwebtoken');
const config = require('../config');

// In-memory token blocklist for invalidated tokens (e.g. on logout)
const tokenBlocklist = new Set();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiry,
    }
  );
};

const verifyToken = (token) => {
  if (tokenBlocklist.has(token)) {
    throw new Error('Token has been invalidated');
  }
  return jwt.verify(token, config.jwtSecret);
};

const invalidateToken = (token) => {
  tokenBlocklist.add(token);
};

const isTokenInvalidated = (token) => {
  return tokenBlocklist.has(token);
};

module.exports = {
  generateToken,
  verifyToken,
  invalidateToken,
  isTokenInvalidated,
};
