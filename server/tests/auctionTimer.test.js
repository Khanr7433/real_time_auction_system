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
});
