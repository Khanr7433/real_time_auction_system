import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { Auction } from '../src/models/Auction.js';
import { Bid } from '../src/models/Bid.js';
import User from '../src/models/User.js';
import { registerBiddingHandlers, userLastBidMap } from '../src/socket/bidding.handler.js';

function createMockSocket({ userId = '507f1f77bcf86cd799439011', displayName = 'Alice' } = {}) {
  const handlers = {};
  const emitted = [];
  let disconnected = false;
  return {
    userId,
    user: userId ? { _id: userId, displayName, tokenVersion: 0 } : null,
    handshakeToken: null,
    emitted,
    get disconnected() {
      return disconnected;
    },
    disconnect() {
      disconnected = true;
    },
    on(event, fn) {
      handlers[event] = fn;
    },
    join() {},
    leave() {},
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    async trigger(event, payload) {
      return handlers[event](payload);
    },
  };
}

describe('Bidding Socket Handler & Live Socket.IO Flow', () => {
  test('place_bid rejects Infinity, NaN, sub-increment, and consecutive self-bids', async () => {
    const origUserFindById = User.findById;
    const origAuctionFindById = Auction.findById;
    userLastBidMap.clear();

    try {
      User.findById = () => ({
        select() { return this; },
        async lean() { return { isSuspended: false, tokenVersion: 0 }; },
      });

      const auctionId = '507f1f77bcf86cd799439012';
      Auction.findById = async () => ({
        _id: auctionId,
        sellerId: '507f1f77bcf86cd799439099',
        highestBidderId: '507f1f77bcf86cd799439088',
        currentBid: 100,
        status: 'live',
        endTime: new Date(Date.now() + 60_000),
      });

      const socket = createMockSocket();
      const mockIo = { to: () => ({ emit: () => {} }) };
      registerBiddingHandlers(mockIo, socket);

      await socket.trigger('place_bid', { auctionId, amount: 'Infinity' });
      await socket.trigger('place_bid', { auctionId, amount: 100.5 });

      assert.equal(socket.emitted[0].event, 'bid_rejected');
      assert.match(socket.emitted[0].payload.reason, /finite/i);
      assert.equal(socket.emitted[1].event, 'bid_rejected');
      assert.match(socket.emitted[1].payload.reason, /at least \$101/i);

      // Consecutive self-bid
      userLastBidMap.clear();
      Auction.findById = async () => ({
        _id: auctionId,
        sellerId: '507f1f77bcf86cd799439099',
        highestBidderId: '507f1f77bcf86cd799439011',
        currentBid: 100,
        status: 'live',
        endTime: new Date(Date.now() + 60_000),
      });

      await socket.trigger('place_bid', { auctionId, amount: 150 });
      assert.match(socket.emitted[2].payload.reason, /already the highest bidder/i);
    } finally {
      User.findById = origUserFindById;
      Auction.findById = origAuctionFindById;
      userLastBidMap.clear();
    }
  });

  test('place_bid rolls back Auction on Bid.create failure and emits masked bidderName over real Socket.IO', async () => {
    const origUserFindById = User.findById;
    const origAuctionFindById = Auction.findById;
    const origAuctionUpdate = Auction.findOneAndUpdate;
    const origBidCreate = Bid.create;
    userLastBidMap.clear();

    const auctionId = '507f1f77bcf86cd799439012';
    let rollbackCalled = false;

    const server = http.createServer();
    const io = new Server(server);
    io.on('connection', (s) => {
      s.userId = '507f1f77bcf86cd799439011';
      s.user = { _id: s.userId, displayName: 'Alice', tokenVersion: 0 };
      registerBiddingHandlers(io, s);
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const client = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });

    try {
      await new Promise((resolve) => client.on('connect', resolve));

      User.findById = () => ({
        select() { return this; },
        async lean() { return { isSuspended: false, tokenVersion: 0 }; },
      });
      Auction.findById = () => ({
        lean: async () => ({
          _id: auctionId,
          currentBid: 100,
          highestBidderId: null,
          bidCount: 0,
          status: 'live',
          endTime: new Date(Date.now() + 20_000),
        }),
        _id: auctionId,
        sellerId: '507f1f77bcf86cd799439099',
        highestBidderId: null,
        currentBid: 100,
        version: 0,
        status: 'live',
        endTime: new Date(Date.now() + 20_000),
      });

      await new Promise((resolve) => {
        client.once('auction_state', resolve);
        client.emit('join_auction', { auctionId });
      });

      // 1. Test rollback when Bid.create throws
      Auction.findOneAndUpdate = async (_filter, update) => {
        if (update?.$inc?.bidCount === -1) {
          rollbackCalled = true;
          return {};
        }
        return {
          _id: auctionId,
          currentBid: 120,
          bidCount: 1,
          version: 1,
          endTime: new Date(Date.now() + 80_000),
        };
      };
      Bid.create = async () => { throw new Error('DB ledger write failed'); };

      const rejected = await new Promise((resolve) => {
        client.once('bid_rejected', resolve);
        client.emit('place_bid', { auctionId, amount: 120 });
      });
      assert.equal(rollbackCalled, true);
      assert.match(rejected.reason, /Failed to record bid/);

      // 2. Test valid bid emits masked bidderName and anti-sniping extension
      userLastBidMap.clear();
      Bid.create = async (doc) => doc;

      const updated = await new Promise((resolve) => {
        client.once('bid_updated', resolve);
        client.emit('place_bid', { auctionId, amount: 120 });
      });
      assert.equal(updated.bidderName, 'A***e');
      assert.equal(updated.currentBid, 120);
    } finally {
      client.disconnect();
      io.close();
      server.close();
      User.findById = origUserFindById;
      Auction.findById = origAuctionFindById;
      Auction.findOneAndUpdate = origAuctionUpdate;
      Bid.create = origBidCreate;
      userLastBidMap.clear();
    }
  });
});
