import jwt from 'jsonwebtoken';
import config from '../config/index.js';

// Bounded in-memory token blocklist mapping token -> expiration timestamp (ms)
const tokenBlocklist = new Map();

const pruneTokenBlocklist = (nowMs = Date.now()) => {
  for (const [token, expiresAtMs] of tokenBlocklist.entries()) {
    if (expiresAtMs <= nowMs) {
      tokenBlocklist.delete(token);
    }
  }
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: typeof user.tokenVersion === 'number' ? user.tokenVersion : 0,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiry,
    }
  );
};

const verifyToken = (token) => {
  if (isTokenInvalidated(token)) {
    throw new Error('Token has been invalidated');
  }
  return jwt.verify(token, config.jwtSecret);
};

const invalidateToken = (token) => {
  if (!token || typeof token !== 'string') return;
  pruneTokenBlocklist();

  let expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded.exp === 'number') {
      expiresAtMs = decoded.exp * 1000;
    }
  } catch {
    // Fall back to 24h cap if token is unparseable
  }

  if (expiresAtMs > Date.now()) {
    tokenBlocklist.set(token, expiresAtMs);
  }
};

const isTokenInvalidated = (token) => {
  pruneTokenBlocklist();
  return tokenBlocklist.has(token);
};

export {
  generateToken,
  verifyToken,
  invalidateToken,
  isTokenInvalidated,
  pruneTokenBlocklist,
  tokenBlocklist,
};
