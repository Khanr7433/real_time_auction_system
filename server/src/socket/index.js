import { verifyToken, isTokenInvalidated } from '../utils/token.js';
import User from '../models/User.js';

export function setupSocketAuth(io) {
  // Middleware to authenticate socket connections with JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      if (isTokenInvalidated(token)) {
        return next(new Error('Authentication error: Token has been invalidated'));
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isSuspended) {
        return next(new Error('Authentication error: User account is suspended'));
      }

      // Attach authenticated user to socket instance
      socket.user = user;
      socket.userId = user._id.toString();

      next();
    } catch (err) {
      next(new Error('Authentication error: ' + (err.message || 'Internal error')));
    }
  });
}

export function initSocket(io) {
  setupSocketAuth(io);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.displayName || socket.userId})`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export default initSocket;
