import mongoose from 'mongoose';
import config from './index.js';

let isListenersRegistered = false;
let retryTimeoutId = null;

const scheduleReconnect = (delayMs = 5000) => {
  if (retryTimeoutId || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }
  retryTimeoutId = setTimeout(async () => {
    retryTimeoutId = null;
    console.log('[MongoDB] Attempting to reconnect to database...');
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (err) {
      console.warn(`[MongoDB] Reconnection failed (${err.message}). Retrying in ${delayMs / 1000}s...`);
      scheduleReconnect(delayMs);
    }
  }, delayMs);
};

const registerConnectionListeners = () => {
  if (isListenersRegistered) return;
  isListenersRegistered = true;

  mongoose.connection.on('connected', () => {
    console.log(`[MongoDB] Connected successfully to host: ${mongoose.connection.host}`);
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost. Reconnect will be attempted...');
    scheduleReconnect(5000);
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection restored.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Connection error: ${err.message}`);
  });
};

const connectDB = async ({ autoRetry = true, timeoutMs = 5000 } = {}) => {
  registerConnectionListeners();

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: timeoutMs,
    });
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection error: ${error.message}`);
    console.warn(
      '[MongoDB] Notice: If using MongoDB Atlas, ensure your current IP is whitelisted under Network Access. If using local MongoDB, ensure your service is running.'
    );
    if (autoRetry) {
      scheduleReconnect(5000);
    }
    throw error;
  }
};

const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

const closeDB = async () => {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export { connectDB, getDatabaseStatus, closeDB, scheduleReconnect };
export default connectDB;
