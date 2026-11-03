const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const config = require('./config');
const connectDB = require('./config/db');

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
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

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

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };
