import { Auction } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import auctionTimerService from '../services/auctionTimer.service.js';
import {
  cleanupStoredImages,
  cleanupUploadedFiles,
  escapeRegex,
  isValidObjectId,
  maskDisplayName,
} from '../utils/validation.js';

const VALID_CONDITIONS = new Set(['new', 'like-new', 'good', 'fair', 'poor']);
const VALID_STATUSES = new Set(['pending', 'live', 'completed', 'unsold', 'admin-terminated']);

// POST /api/auctions - Create a new auction
export async function createAuction(req, res) {
  try {
    const { title, category, description, condition, startingBid, endTime } = req.body || {};

    if (
      typeof title !== 'string' ||
      typeof category !== 'string' ||
      typeof description !== 'string' ||
      !title.trim() ||
      !category.trim() ||
      !description.trim() ||
      startingBid === undefined ||
      !endTime
    ) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'All fields (title, category, description, startingBid, endTime) are required' });
    }

    if (condition !== undefined && (typeof condition !== 'string' || !VALID_CONDITIONS.has(condition))) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Invalid item condition' });
    }

    const numStartingBid = Number(startingBid);
    if (!Number.isFinite(numStartingBid) || numStartingBid < 1) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Starting bid must be at least 1' });
    }

    const endDateTime = new Date(endTime);
    if (isNaN(endDateTime.getTime())) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Invalid end date format' });
    }

    if (endDateTime.getTime() <= Date.now()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Auction end time must be in the future' });
    }

    const images = req.files && Array.isArray(req.files)
      ? req.files.slice(0, 5).map((f) => `/uploads/${f.filename}`)
      : [];
    if (req.files && Array.isArray(req.files) && req.files.length > 5) {
      cleanupUploadedFiles(req.files.slice(5));
    }

    const auction = await Auction.create({
      sellerId: req.user.id,
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      condition: condition || 'good',
      startingBid: numStartingBid,
      currentBid: numStartingBid,
      endTime: endDateTime,
      images,
      status: 'live',
    });

    return res.status(201).json({
      message: 'Auction created successfully',
      auctionId: auction._id,
      auction,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    const status = error?.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ error: error.message || 'Failed to create auction' });
  }
}

// PUT /api/auctions/:id - Update an auction (only if bidCount === 0 and user is seller)
export async function updateAuction(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const { title, category, description, condition, startingBid, endTime } = req.body || {};

    const auction = await Auction.findById(id);
    if (!auction) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({ error: 'You do not have permission to edit this auction' });
    }

    if (auction.bidCount > 0) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({ error: 'Listing is locked and cannot be edited after bids have been placed' });
    }

    if (auction.status !== 'live' && auction.status !== 'pending') {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({ error: 'Closed listings cannot be edited' });
    }

    const updates = {};

    if (startingBid !== undefined) {
      const numStartingBid = Number(startingBid);
      if (!Number.isFinite(numStartingBid) || numStartingBid < 1) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Starting bid must be at least 1' });
      }
      updates.startingBid = numStartingBid;
      updates.currentBid = numStartingBid;
    }

    if (endTime !== undefined) {
      const endDateTime = new Date(endTime);
      if (isNaN(endDateTime.getTime()) || endDateTime.getTime() <= Date.now()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Auction end time must be in the future' });
      }
      updates.endTime = endDateTime;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Title must be a non-empty string' });
      }
      updates.title = title.trim();
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Category must be a non-empty string' });
      }
      updates.category = category.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Description must be a non-empty string' });
      }
      updates.description = description.trim();
    }

    if (condition !== undefined) {
      if (typeof condition !== 'string' || !VALID_CONDITIONS.has(condition)) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({ error: 'Invalid item condition' });
      }
      updates.condition = condition;
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const existing = Array.isArray(auction.images) ? auction.images : [];
      const availableSlots = Math.max(0, 5 - existing.length);
      const acceptedFiles = req.files.slice(0, availableSlots);
      const rejectedFiles = req.files.slice(availableSlots);
      cleanupUploadedFiles(rejectedFiles);

      if (acceptedFiles.length > 0) {
        updates.images = [...existing, ...acceptedFiles.map((f) => `/uploads/${f.filename}`)];
      }
    }

    const updated = await Auction.findOneAndUpdate(
      { _id: id, bidCount: 0, status: { $in: ['live', 'pending'] } },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({ error: 'Listing is locked and cannot be edited after bids have been placed' });
    }

    return res.status(200).json({
      message: 'Auction updated successfully',
      auction: updated,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    const status = error?.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ error: error.message || 'Failed to update auction' });
  }
}

// DELETE /api/auctions/:id - Delete an auction (only if bidCount === 0 and user is seller)
export async function deleteAuction(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this auction' });
    }

    if (auction.bidCount > 0) {
      return res.status(403).json({ error: 'Listing cannot be deleted after bids have been placed' });
    }

    const deleted = await Auction.findOneAndDelete({ _id: id, bidCount: 0 });
    if (!deleted) {
      return res.status(403).json({ error: 'Listing cannot be deleted after bids have been placed' });
    }

    cleanupStoredImages(deleted.images);
    auctionTimerService.warningSent.delete(id);

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction_ended', {
        auctionId: id,
        status: 'deleted',
        reason: 'Listing removed by seller',
      });
    }

    return res.status(200).json({ message: 'Auction deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to delete auction' });
  }
}

// GET /api/auctions - List auctions with search, filter, and pagination
export async function getAuctions(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      if (req.query.status !== 'all') {
        if (!VALID_STATUSES.has(req.query.status)) {
          return res.status(400).json({ error: 'Invalid auction status filter' });
        }
        filter.status = req.query.status;
      }
    } else {
      filter.status = 'live';
    }

    if (req.query.sellerId) {
      if (!isValidObjectId(req.query.sellerId)) {
        return res.status(400).json({ error: 'Invalid seller identifier' });
      }
      filter.sellerId = req.query.sellerId;
    }

    if (req.query.category && req.query.category !== 'all' && typeof req.query.category === 'string') {
      filter.category = req.query.category.trim();
    }

    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.currentBid = {};
      if (req.query.minPrice !== undefined) {
        const minPrice = Number(req.query.minPrice);
        if (!Number.isFinite(minPrice) || minPrice < 0) {
          return res.status(400).json({ error: 'Invalid minPrice filter' });
        }
        filter.currentBid.$gte = minPrice;
      }
      if (req.query.maxPrice !== undefined) {
        const maxPrice = Number(req.query.maxPrice);
        if (!Number.isFinite(maxPrice) || maxPrice < 0) {
          return res.status(400).json({ error: 'Invalid maxPrice filter' });
        }
        filter.currentBid.$lte = maxPrice;
      }
    }

    const escapedSearch = escapeRegex(req.query.search);
    if (escapedSearch) {
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate('sellerId', 'displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Auction.countDocuments(filter),
    ]);

    const enriched = auctions.map((a) => {
      const remainingSeconds = Math.max(0, Math.ceil((new Date(a.endTime).getTime() - Date.now()) / 1000));
      return {
        ...a,
        timeRemainingSeconds: remainingSeconds,
      };
    });

    return res.status(200).json({
      auctions: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch auctions' });
  }
}

// GET /api/auctions/:id - Get full auction details
export async function getAuctionById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const auction = await Auction.findById(id)
      .populate('sellerId', 'displayName avatar createdAt')
      .populate('highestBidderId', 'displayName')
      .lean();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const remainingSeconds = Math.max(0, Math.ceil((new Date(auction.endTime).getTime() - Date.now()) / 1000));

    return res.status(200).json({
      ...auction,
      timeRemainingSeconds: remainingSeconds,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch auction details' });
  }
}

// GET /api/auctions/:id/bids - Get chronological bid history for an auction
export async function getAuctionBids(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 30));

    const bids = await Bid.find({ auctionId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('bidderId', 'displayName avatar')
      .lean();

    const maskedBids = bids.map((b) => ({
      _id: b._id,
      amount: b.amount,
      createdAt: b.createdAt,
      bidderName: maskDisplayName(b.bidderId?.displayName),
    }));

    return res.status(200).json({
      bids: maskedBids,
      total: maskedBids.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch bid history' });
  }
}
