import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { getDatabaseStatus } from '../src/config/db.js';

describe('Server Architecture & Modules Sanity Test', () => {
  test('Token utility functions are defined', async () => {
    const { generateToken, verifyToken, isTokenInvalidated } = await import('../src/utils/token.js');
    assert.equal(typeof generateToken, 'function');
    assert.equal(typeof verifyToken, 'function');
    assert.equal(typeof isTokenInvalidated, 'function');
  });

  test('Config object contains required server settings', async () => {
    const { default: config } = await import('../src/config/index.js');
    assert.ok(config.port);
    assert.ok(config.jwtSecret);
  });

  test('getDatabaseStatus accurately reflects mongoose connection readyState', () => {
    const originalReadyState = mongoose.connection.readyState;

    try {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });
      assert.equal(getDatabaseStatus(), 'disconnected');

      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true, writable: true });
      assert.equal(getDatabaseStatus(), 'connected');

      Object.defineProperty(mongoose.connection, 'readyState', { value: 2, configurable: true, writable: true });
      assert.equal(getDatabaseStatus(), 'connecting');

      Object.defineProperty(mongoose.connection, 'readyState', { value: 3, configurable: true, writable: true });
      assert.equal(getDatabaseStatus(), 'disconnecting');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true, writable: true });
    }
  });

  test('GET /api/health returns status ok and database connectivity status', async () => {
    const { default: app } = await import('../src/app.js');

    const req = new http.IncomingMessage(null);
    req.method = 'GET';
    req.url = '/api/health';
    req.headers = { host: 'localhost' };
    req.socket = { remoteAddress: '127.0.0.1' };

    const res = new http.ServerResponse(req);
    let responseData = '';

    await new Promise((resolve) => {
      res.write = (chunk) => {
        if (chunk) responseData += chunk.toString();
        return true;
      };
      res.end = (chunk) => {
        if (chunk) responseData += chunk.toString();
        resolve();
      };
      app(req, res);
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(responseData);
    assert.equal(json.status, 'ok');
    assert.equal(json.service, 'BidNow API');
    assert.ok(typeof json.database === 'string');
    assert.ok(new Date(json.timestamp).getTime() > 0);
  });
});
