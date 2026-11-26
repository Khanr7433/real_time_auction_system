import { verifyToken, isTokenInvalidated } from '../utils/token.js';
import User from '../models/User.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || isTokenInvalidated(token)) {
      return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach token to request for logout
    req.token = token;

    // Fetch user from DB to ensure still valid and not suspended
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User associated with token no longer exists' });
    }

    const currentVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
    const tokenVersion = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ error: 'Session has expired. Please log in again.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'User account has been suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export { authenticate };
export default authenticate;
