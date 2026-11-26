import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';

import config from './config/index.js';
import connectDB, { getDatabaseStatus } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import initSocket from './socket/index.js';
import auctionTimerService from './services/auctionTimer.service.js';
import notificationService from './services/notification.service.js';

const app = express();
app.set('trust proxy', 1);
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
app.use('/api/disputes', disputeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.status(200).json({
    status: 'ok',
    service: 'BidNow API',
    database: dbStatus,
    timestamp: new Date(),
  });
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier format' });
  }
  if (err?.name === 'ValidationError') {
    const firstMessage = Object.values(err.errors || {})[0]?.message;
    return res.status(400).json({ error: firstMessage || 'Validation failed' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate resource conflict' });
  }

  const status = err?.status || err?.statusCode || 500;
  const message = status >= 500 ? 'Internal Server Error' : (err?.message || 'Request failed');
  return res.status(status).json({ error: message });
});

// Start function for server & DB
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[Server] Proceeding without immediate DB connection (auto-retry active in background)...');
  }

  // Initialize Auction Timer Service upon server startup
  auctionTimerService.init(io);

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
