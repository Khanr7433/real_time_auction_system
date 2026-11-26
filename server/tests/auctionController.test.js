import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Auction } from '../src/models/Auction.js';
import { Bid } from '../src/models/Bid.js';
import {
  createAuction,
  updateAuction,
  deleteAuction,
  getAuctions,
  getAuctionBids,
} from '../src/controllers/auction.controller.js';

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

describe('Auction Controller Hardening', () => {
  test('createAuction rejects startingBid < 1 and cleans up uploaded files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidnow-auc-'));
    const tempFile = path.join(tmpDir, 'img.png');
    fs.writeFileSync(tempFile, 'dummy');

    const req = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: {
        title: 'Watch',
        category: 'watches',
        description: 'Mint',
        startingBid: '0.5',
        endTime: new Date(Date.now() + 60_000).toISOString(),
      },
      files: [{ path: tempFile, filename: 'img.png' }],
    };

    const res = createMockRes();
    await createAuction(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(fs.existsSync(tempFile), false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('getAuctions supports status=all, escapes regex, validates sellerId/minPrice, and omits seller email', async () => {
    const originalFind = Auction.find;
    const originalCount = Auction.countDocuments;
    let capturedFilter = null;
    let capturedPopulate = null;

    try {
      Auction.find = (filter) => {
        capturedFilter = filter;
        return {
          populate(field, proj) {
            capturedPopulate = { field, proj };
            return this;
          },
          sort() { return this; },
          skip() { return this; },
          limit() { return this; },
          async lean() { return []; },
        };
      };
      Auction.countDocuments = async () => 0;

      const badRes = createMockRes();
      await getAuctions({ query: { sellerId: 'bad-id' } }, badRes);
      assert.equal(badRes.statusCode, 400);

      const res = createMockRes();
      await getAuctions(
        {
          query: {
            status: 'all',
            sellerId: '507f1f77bcf86cd799439011',
            search: '[vintage](watch)',
          },
        },
        res
      );

      assert.equal(res.statusCode, 200);
      assert.equal(capturedFilter.status, undefined);
      assert.equal(capturedFilter.$or[0].title.$regex, '\\[vintage\\]\\(watch\\)');
      assert.equal(capturedPopulate.proj.includes('email'), false);
    } finally {
      Auction.find = originalFind;
      Auction.countDocuments = originalCount;
    }
  });

  test('updateAuction blocks edits on closed auctions and slices excess files cleanly', async () => {
    const originalFindById = Auction.findById;
    try {
      Auction.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        sellerId: '507f1f77bcf86cd799439012',
        bidCount: 0,
        status: 'unsold',
      });

      const res = createMockRes();
      await updateAuction(
        {
          params: { id: '507f1f77bcf86cd799439011' },
          user: { id: '507f1f77bcf86cd799439012', role: 'user' },
          body: { title: 'Updated' },
          files: [],
        },
        res
      );

      assert.equal(res.statusCode, 403);
    } finally {
      Auction.findById = originalFindById;
    }
  });

  test('getAuctionBids masks bidderName and omits raw bidderId', async () => {
    const originalFind = Bid.find;
    try {
      Bid.find = () => ({
        sort() { return this; },
        limit() { return this; },
        populate() { return this; },
        async lean() {
          return [
            {
              _id: 'bid-1',
              amount: 120,
              createdAt: new Date(),
              bidderId: { _id: 'secret-user-id', displayName: 'Alice' },
            },
          ];
        },
      });

      const res = createMockRes();
      await getAuctionBids({ params: { id: '507f1f77bcf86cd799439011' }, query: {} }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.bids[0].bidderName, 'A***e');
      assert.equal(res.body.bids[0].bidderId, undefined);
    } finally {
      Bid.find = originalFind;
    }
  });

  test('deleteAuction rejects non-ObjectId cleanly with 400', async () => {
    const res = createMockRes();
    await deleteAuction({ params: { id: 'invalid' }, user: { id: '1', role: 'user' } }, res);
    assert.equal(res.statusCode, 400);
  });
});
