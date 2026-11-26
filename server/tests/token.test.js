import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import config from '../src/config/index.js';
import {
  generateToken,
  verifyToken,
  invalidateToken,
  isTokenInvalidated,
  pruneTokenBlocklist,
  tokenBlocklist,
} from '../src/utils/token.js';

describe('Token Utilities & Blocklist Pruning', () => {
  test('generateToken embeds id, email, role, and tokenVersion', () => {
    const token = generateToken({
      _id: 'user-1',
      email: 'alice@example.com',
      role: 'admin',
      tokenVersion: 3,
    });

    const decoded = verifyToken(token);
    assert.equal(decoded.id, 'user-1');
    assert.equal(decoded.email, 'alice@example.com');
    assert.equal(decoded.role, 'admin');
    assert.equal(decoded.tokenVersion, 3);
  });

  test('invalidateToken marks token invalid and prunes expired tokens', () => {
    tokenBlocklist.clear();

    const activeToken = generateToken({
      _id: 'user-2',
      email: 'bob@example.com',
      role: 'user',
      tokenVersion: 0,
    });

    invalidateToken(activeToken);
    assert.equal(isTokenInvalidated(activeToken), true);
    assert.throws(() => verifyToken(activeToken), /invalidated/i);

    const expiredToken = jwt.sign(
      { id: 'user-3', exp: Math.floor(Date.now() / 1000) - 60 },
      config.jwtSecret
    );
    tokenBlocklist.set(expiredToken, Date.now() - 60_000);
    pruneTokenBlocklist();
    assert.equal(tokenBlocklist.has(expiredToken), false);
    assert.equal(tokenBlocklist.has(activeToken), true);

    tokenBlocklist.clear();
  });
});
