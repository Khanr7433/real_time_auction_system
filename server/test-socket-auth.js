import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import initSocket from './src/socket/index.js';
import { generateToken } from './src/utils/token.js';
import User from './src/models/User.js';

// Mock User.findById to return a valid user without DB connection
const originalFindById = User.findById;
User.findById = (id) => {
  return Promise.resolve({
    _id: id,
    email: 'test@bidnow.com',
    displayName: 'Test Bidder',
    role: 'user',
    isSuspended: false,
  });
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initSocket(io);

io.engine.on('connection_error', (err) => {
  console.log('Server engine error:', err.code, err.message, err.context);
});

server.listen(5099, '127.0.0.1', async () => {
  console.log('Test Socket Server listening on 127.0.0.1:5099');

  try {
    // Test 1: Connect without token -> should fail
    console.log('\n--- Test 1: Connect without token ---');
    const socketWithoutToken = Client('http://127.0.0.1:5099');

    await new Promise((resolve, reject) => {
      socketWithoutToken.on('connect_error', (err) => {
        console.log('✓ Rejected without token as expected:', err.message);
        socketWithoutToken.close();
        resolve();
      });
      socketWithoutToken.on('connect', () => {
        socketWithoutToken.close();
        reject(new Error('Should NOT connect without token'));
      });
    });

    // Test 2: Connect with invalid token -> should fail
    console.log('\n--- Test 2: Connect with invalid token ---');
    const socketWithBadToken = Client('http://127.0.0.1:5099', {
      auth: { token: 'invalid.jwt.token' },
    });

    await new Promise((resolve, reject) => {
      socketWithBadToken.on('connect_error', (err) => {
        console.log('✓ Rejected bad token as expected:', err.message);
        socketWithBadToken.close();
        resolve();
      });
      socketWithBadToken.on('connect', () => {
        socketWithBadToken.close();
        reject(new Error('Should NOT connect with bad token'));
      });
    });

    // Test 3: Connect with valid token -> should succeed
    console.log('\n--- Test 3: Connect with valid token ---');
    const validToken = generateToken({
      _id: '507f1f77bcf86cd799439011',
      email: 'test@bidnow.com',
      role: 'user',
    });

    const socketWithValidToken = Client('http://127.0.0.1:5099', {
      transports: ['websocket'],
      auth: { token: validToken },
    });

    await new Promise((resolve, reject) => {
      socketWithValidToken.on('connect', () => {
        console.log('✓ Connected successfully with valid token! Socket ID:', socketWithValidToken.id);
        socketWithValidToken.close();
        resolve();
      });
      socketWithValidToken.on('connect_error', (err) => {
        console.log('Connect error details:', err.message, err.description, err.context);
        socketWithValidToken.close();
        reject(new Error('Connection failed with valid token: ' + err.message));
      });
    });

    console.log('\nALL SOCKET AUTH TESTS PASSED! ✓');
    User.findById = originalFindById;
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Test failed:', error);
    User.findById = originalFindById;
    server.close(() => process.exit(1));
  }
});
