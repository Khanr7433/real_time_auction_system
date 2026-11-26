import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import { Auction } from '../src/models/Auction.js';
import { Bid } from '../src/models/Bid.js';
import { Dispute } from '../src/models/Dispute.js';
import { updateProfile } from '../src/controllers/user.controller.js';
import { createDispute } from '../src/controllers/dispute.controller.js';
import {
  getAnalytics,
  getAdminAuctions,
  deleteAdminAuction,
  terminateAuction,
  resolveDispute,
} from '../src/controllers/admin.controller.js';

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

describe('User, Dispute & Admin Controller Hardening', () => {
  test('updateProfile rejects invalid avatar schemes', async () => {
    const res = createMockRes();
    await updateProfile(
      {
        user: { _id: '507f1f77bcf86cd799439011' },
        body: { avatar: 'javascript:alert(1)' },
      },
      res,
      (e) => { throw e; }
    );
    assert.equal(res.statusCode, 400);
  });

  test('createDispute returns 404 when referenced auction does not exist', async () => {
    const originalFindById = Auction.findById;
    try {
      Auction.findById = async () => null;
      const res = createMockRes();
      await createDispute(
        {
          user: { _id: '507f1f77bcf86cd799439011' },
          body: {
            auctionId: '507f1f77bcf86cd799439099',
            description: 'Seller never shipped item',
          },
        },
        res,
        (e) => { throw e; }
      );
      assert.equal(res.statusCode, 404);
    } finally {
      Auction.findById = originalFindById;
    }
  });

  test('getAnalytics includes pending auctions count', async () => {
    const origUserCount = User.countDocuments;
    const origAuctionAgg = Auction.aggregate;
    const origBidAgg = Bid.aggregate;
    const origDisputeCount = Dispute.countDocuments;

    try {
      User.countDocuments = async () => 5;
      Auction.aggregate = async () => [
        { _id: 'live', count: 2 },
        { _id: 'pending', count: 3 },
      ];
      Bid.aggregate = async () => [{ totalVolume: 500, totalBids: 4 }];
      Dispute.countDocuments = async () => 1;

      const res = createMockRes();
      await getAnalytics({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.auctions.pending, 3);
      assert.equal(res.body.auctions.total, 5);
    } finally {
      User.countDocuments = origUserCount;
      Auction.aggregate = origAuctionAgg;
      Bid.aggregate = origBidAgg;
      Dispute.countDocuments = origDisputeCount;
    }
  });

  test('getAdminAuctions matches seller displayName/email with escaped regex', async () => {
    const origUserFind = User.find;
    const origAuctionFind = Auction.find;
    const origAuctionCount = Auction.countDocuments;
    let capturedFilter = null;

    try {
      User.find = () => ({
        select() { return this; },
        async lean() { return [{ _id: 'seller-1' }]; },
      });
      Auction.find = (filter) => {
        capturedFilter = filter;
        return {
          populate() { return this; },
          sort() { return this; },
          skip() { return this; },
          limit() { return this; },
          async lean() { return []; },
        };
      };
      Auction.countDocuments = async () => 0;

      const res = createMockRes();
      await getAdminAuctions({ query: { search: 'alice+test' } }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter.$or[2], { sellerId: { $in: ['seller-1'] } });
    } finally {
      User.find = origUserFind;
      Auction.find = origAuctionFind;
      Auction.countDocuments = origAuctionCount;
    }
  });

  test('deleteAdminAuction deletes related bids and emits supplied reason', async () => {
    const origFindDel = Auction.findByIdAndDelete;
    const origBidDel = Bid.deleteMany;
    let deletedBidFilter = null;
    let emitted = null;

    try {
      Auction.findByIdAndDelete = async () => ({
        _id: '507f1f77bcf86cd799439011',
        title: 'Watch',
        currentBid: 250,
        images: [],
        sellerId: null,
      });
      Bid.deleteMany = async (f) => { deletedBidFilter = f; };

      const res = createMockRes();
      await deleteAdminAuction(
        {
          params: { id: '507f1f77bcf86cd799439011' },
          body: { reason: 'Counterfeit item' },
          app: {
            get(key) {
              if (key !== 'io') return null;
              return {
                to() {
                  return {
                    emit(evt, data) { emitted = { evt, data }; },
                  };
                },
              };
            },
          },
        },
        res
      );

      assert.equal(res.statusCode, 200);
      assert.deepEqual(deletedBidFilter, { auctionId: '507f1f77bcf86cd799439011' });
      assert.equal(emitted.evt, 'auction_ended');
      assert.equal(emitted.data.reason, 'Counterfeit item');
      assert.equal(emitted.data.finalBid, 250);
    } finally {
      Auction.findByIdAndDelete = origFindDel;
      Bid.deleteMany = origBidDel;
    }
  });

  test('terminateAuction rejects non-live auction and resolveDispute rejects non-open dispute', async () => {
    const origAuctionUpdate = Auction.findOneAndUpdate;
    const origAuctionFind = Auction.findById;
    const origDisputeUpdate = Dispute.findOneAndUpdate;
    const origDisputeFind = Dispute.findById;

    try {
      Auction.findOneAndUpdate = async () => null;
      Auction.findById = () => ({
        select() { return this; },
        async lean() { return { status: 'completed' }; },
      });

      const termRes = createMockRes();
      await terminateAuction({ params: { id: '507f1f77bcf86cd799439011' }, body: {} }, termRes);
      assert.equal(termRes.statusCode, 400);

      Dispute.findOneAndUpdate = () => ({ async populate() { return null; } });
      Dispute.findById = () => ({
        select() { return this; },
        async lean() { return { status: 'resolved' }; },
      });

      const dispRes = createMockRes();
      await resolveDispute(
        { params: { id: '507f1f77bcf86cd799439011' }, body: { status: 'resolved' } },
        dispRes
      );
      assert.equal(dispRes.statusCode, 400);
    } finally {
      Auction.findOneAndUpdate = origAuctionUpdate;
      Auction.findById = origAuctionFind;
      Dispute.findOneAndUpdate = origDisputeUpdate;
      Dispute.findById = origDisputeFind;
    }
  });
});
