import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import { forgotPassword, login, resetPassword } from '../src/controllers/auth.controller.js';
import { authenticate } from '../src/middleware/auth.middleware.js';
import emailService from '../src/services/email.service.js';
import { generateToken } from '../src/utils/token.js';

function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('Auth Security & Session Revocation', () => {
  test('forgotPassword dispatches reset email without exposing resetToken in HTTP response', async () => {
    const originalFindOne = User.findOne;
    const sent = [];
    emailService.setTransport({
      async sendMail(mail) {
        sent.push(mail);
        return { messageId: 'ok' };
      },
    });

    const mockUser = {
      email: 'alice@example.com',
      resetPasswordToken: null,
      resetPasswordExpires: null,
      async save() {},
    };

    try {
      User.findOne = async ({ email }) => (email === 'alice@example.com' ? mockUser : null);

      const resKnown = createMockRes();
      await forgotPassword({ body: { email: 'alice@example.com' } }, resKnown, (e) => { throw e; });

      const resUnknown = createMockRes();
      await forgotPassword({ body: { email: 'nobody@example.com' } }, resUnknown, (e) => { throw e; });

      assert.equal(resKnown.statusCode, 200);
      assert.equal(resUnknown.statusCode, 200);
      assert.equal(resKnown.body.resetToken, undefined);
      assert.equal(resKnown.body.message, resUnknown.body.message);
      assert.equal(sent.length, 1);
      assert.ok(mockUser.resetPasswordToken);
    } finally {
      User.findOne = originalFindOne;
      emailService.setTransport(null);
    }
  });

  test('login returns 401 on bad password even when account is suspended, and 403 on valid password', async () => {
    const originalFindOne = User.findOne;
    const suspendedUser = {
      _id: 'user-susp',
      email: 'susp@example.com',
      role: 'user',
      isSuspended: true,
      tokenVersion: 0,
      async comparePassword(pw) {
        return pw === 'correct-password';
      },
      toJSON() {
        return { _id: this._id, email: this.email };
      },
    };

    try {
      User.findOne = async () => suspendedUser;

      const badRes = createMockRes();
      await login({ body: { email: 'susp@example.com', password: 'wrong' } }, badRes, (e) => { throw e; });
      assert.equal(badRes.statusCode, 401);

      const goodRes = createMockRes();
      await login({ body: { email: 'susp@example.com', password: 'correct-password' } }, goodRes, (e) => { throw e; });
      assert.equal(goodRes.statusCode, 403);
    } finally {
      User.findOne = originalFindOne;
    }
  });

  test('resetPassword increments tokenVersion and disconnects active user sockets', async () => {
    const originalFindOne = User.findOne;
    const originalHashPassword = User.hashPassword;
    let disconnectedRoom = null;

    const mockUser = {
      _id: 'user-reset',
      tokenVersion: 2,
      passwordHash: 'old',
      resetPasswordToken: 'hash',
      resetPasswordExpires: new Date(Date.now() + 10000),
      async save() {},
    };

    try {
      User.findOne = async () => mockUser;
      User.hashPassword = async () => 'new-hash';

      const req = {
        body: { token: 'plain-token', newPassword: 'newpassword123' },
        app: {
          get(key) {
            if (key !== 'io') return null;
            return {
              in(room) {
                disconnectedRoom = room;
                return { disconnectSockets() {} };
              },
            };
          },
        },
      };

      const res = createMockRes();
      await resetPassword(req, res, (e) => { throw e; });

      assert.equal(res.statusCode, 200);
      assert.equal(mockUser.tokenVersion, 3);
      assert.equal(mockUser.resetPasswordToken, null);
      assert.equal(disconnectedRoom, 'user:user-reset');
    } finally {
      User.findOne = originalFindOne;
      User.hashPassword = originalHashPassword;
    }
  });

  test('authenticate rejects JWT when user tokenVersion has incremented', async () => {
    const originalFindById = User.findById;
    const staleToken = generateToken({
      _id: 'user-tv',
      email: 'tv@example.com',
      role: 'user',
      tokenVersion: 0,
    });

    try {
      User.findById = async () => ({
        _id: 'user-tv',
        email: 'tv@example.com',
        role: 'user',
        isSuspended: false,
        tokenVersion: 1,
      });

      const req = { headers: { authorization: `Bearer ${staleToken}` } };
      const res = createMockRes();
      let nextCalled = false;

      await authenticate(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
    } finally {
      User.findById = originalFindById;
    }
  });
});
