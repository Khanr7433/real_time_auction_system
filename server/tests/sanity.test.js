import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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
});
