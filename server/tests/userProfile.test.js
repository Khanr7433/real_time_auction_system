import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getProfile } from '../src/controllers/user.controller.js';

describe('User Profile Controller', () => {
  test('getProfile returns wrapped user object including isSuspended', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const req = {
      user: {
        _id: 'user-123',
        email: 'bidder@example.com',
        displayName: 'Alice',
        contactInfo: '+1-555-0100',
        avatar: 'https://example.com/avatar.png',
        role: 'user',
        isSuspended: false,
        createdAt,
      },
    };

    let statusCode = null;
    let payload = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };

    let nextErr = null;
    await getProfile(req, res, (err) => {
      nextErr = err;
    });

    assert.equal(nextErr, null);
    assert.equal(statusCode, 200);
    assert.deepEqual(payload, {
      user: {
        id: 'user-123',
        email: 'bidder@example.com',
        displayName: 'Alice',
        contactInfo: '+1-555-0100',
        avatar: 'https://example.com/avatar.png',
        role: 'user',
        isSuspended: false,
        createdAt,
      },
    });
  });
});
