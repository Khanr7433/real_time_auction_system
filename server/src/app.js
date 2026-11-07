import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';

import config from './config/index.js';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import initSocket from './socket/index.js';
import auctionTimerService from './services/auctionTimer.service.js';
import notificationService from './services/notification.service.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Configure Socket.io authentication & event handlers
initSocket(io);

// Initialize Auction Timer Service (server-authoritative countdown & auto-close)
auctionTimerService.init(io);

// Initialize Notification Service for WebSocket push
notificationService.init(io);

// Attach io instance to express app for route handlers
app.set('io', io);

// Security & utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads directory
app.use('/uploads', express.static(path.resolve(import.meta.dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'BidNow API', timestamp: new Date() });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start function for server & DB
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('Proceeding without immediate DB connection (will retry as needed)...');
  }

  return new Promise((resolve) => {
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      resolve({ app, server, io });
    });
  });
};

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('app.js') ||
  process.argv[1].endsWith('app')
);

if (isDirectRun) {
  startServer();
}

export { app, server, io, startServer };
export default app;
