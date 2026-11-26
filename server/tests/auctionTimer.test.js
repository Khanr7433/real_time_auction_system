import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Auction } from '../src/models/Auction.js';
import auctionTimerService from '../src/services/auctionTimer.service.js';

describe('AuctionTimerService Resilience & Concurrency Guard', () => {
  let originalReadyState;
  let originalFind;

  beforeEach(() => {
    // Preserve originals
    originalReadyState = mongoose.connection.readyState;
    originalFind = Auction.find;
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: originalReadyState,
      configurable: true,
      writable: true,
    });
    Auction.find = originalFind;
    auctionTimerService.isTicking = false;
    auctionTimerService.stop();
  });

  test('tick() silently skips query when MongoDB is disconnected (readyState !== 1)', async () => {
    // Simulate disconnected state (0)
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      configurable: true,
      writable: true,
    });

    let findCalled = false;
    Auction.find = async () => {
      findCalled = true;
      return [];
    };

    // Run tick
    await auctionTimerService.tick();

    assert.equal(findCalled, false, 'Auction.find should NOT be called when disconnected');
    assert.equal(auctionTimerService.isTicking, false, 'isTicking lock should remain false');
  });

  test('tick() respects isTicking re-entrancy lock and exits early', async () => {
    // Simulate connected state (1)
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
      writable: true,
    });

    // Artificially acquire lock
    auctionTimerService.isTicking = true;

    let findCalled = false;
    Auction.find = async () => {
      findCalled = true;
      return [];
    };

    // Run tick
    await auctionTimerService.tick();

    assert.equal(findCalled, false, 'Auction.find should NOT be called when isTicking is true');
    assert.equal(auctionTimerService.isTicking, true, 'isTicking should remain in original state');
  });

  test('tick() queries live auctions when connected and safely resets isTicking lock on completion', async () => {
    // Simulate connected state (1)
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
      writable: true,
    });

    let findArgs = null;
    Auction.find = async (query) => {
      findArgs = query;
      return [];
    };

    await auctionTimerService.tick();

    assert.deepEqual(findArgs, { status: 'live' }, 'Auction.find should be called with status: live');
    assert.equal(auctionTimerService.isTicking, false, 'isTicking should reset to false after tick finishes');
  });

  test('tick() resets isTicking lock even if query throws an error', async () => {
    // Simulate connected state (1)
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
      writable: true,
    });

    Auction.find = async () => {
      throw new Error('Database query failure simulation');
    };

    // Should not throw unhandled exception
    await auctionTimerService.tick();

    assert.equal(auctionTimerService.isTicking, false, 'isTicking must be released in finally block');
  });

  test('init() starts interval and stop() clears interval cleanly', () => {
    auctionTimerService.stop();
    assert.equal(auctionTimerService.intervalId, null);

    const mockIo = { to: () => ({ emit: () => {} }) };
    auctionTimerService.init(mockIo);
    assert.ok(auctionTimerService.intervalId !== null, 'intervalId should be assigned on init');

    auctionTimerService.stop();
    assert.equal(auctionTimerService.intervalId, null, 'intervalId should be null after stop');
  });

  test('tick() does not close early with 500ms left and emits ending-soon warning with nested data', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
      writable: true,
    });

    const emitted = [];
    const origIo = auctionTimerService.io;
    const origFindOneAndUpdate = Auction.findOneAndUpdate;
    auctionTimerService.io = {
      to(room) {
        return {
          emit(event, payload) {
            emitted.push({ room, event, payload });
          },
        };
      },
    };
    let closeCalled = false;
    Auction.findOneAndUpdate = async () => {
      closeCalled = true;
      return null;
    };

    try {
      const auctionId = '507f1f77bcf86cd799439055';
      auctionTimerService.warningSent.delete(auctionId);

      Auction.find = async () => [
        {
          _id: auctionId,
          endTime: new Date(Date.now() + 500),
          status: 'live',
          bidCount: 0,
          title: 'Lamp',
        },
      ];

      await auctionTimerService.tick();

      assert.equal(closeCalled, false);
      const timeEvent = emitted.find((e) => e.event === 'time_remaining');
      const warnEvent = emitted.find((e) => e.event === 'auction_ending_soon');
      assert.equal(timeEvent.payload.secondsLeft, 1);
      assert.equal(warnEvent.payload.data.auctionId, auctionId);
    } finally {
      auctionTimerService.io = origIo;
      Auction.findOneAndUpdate = origFindOneAndUpdate;
      auctionTimerService.warningSent.clear();
    }
  });

  test('closeAuction uses atomic bidCount filter even when tick snapshot had bidCount 0', async () => {
    const origFindOneAndUpdate = Auction.findOneAndUpdate;
    const origIo = auctionTimerService.io;
    const emitted = [];

    auctionTimerService.io = {
      to(room) {
        return {
          emit(event, payload) {
            emitted.push({ room, event, payload });
          },
        };
      },
    };

    Auction.findOneAndUpdate = async (filter) => {
      if (filter.bidCount && typeof filter.bidCount === 'object' && filter.bidCount.$gt === 0) {
        return {
          _id: filter._id,
          status: 'completed',
          bidCount: 1,
          currentBid: 200,
          highestBidderId: null,
          sellerId: null,
          title: 'Camera',
        };
      }
      return null;
    };

    try {
      await auctionTimerService.closeAuction({
        _id: '507f1f77bcf86cd799439066',
        bidCount: 0,
      });

      const ended = emitted.find((e) => e.event === 'auction_ended');
      assert.equal(ended.payload.status, 'completed');
      assert.equal(ended.payload.finalBid, 200);
    } finally {
      Auction.findOneAndUpdate = origFindOneAndUpdate;
      auctionTimerService.io = origIo;
    }
  });
});
