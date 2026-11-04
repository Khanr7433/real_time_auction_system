import { Auction } from '../models/Auction.js';
import path from 'node:path';
import fs from 'node:fs';

// POST /api/auctions - Create a new auction
export async function createAuction(req, res) {
  try {
    const { title, category, description, condition, startingBid, endTime } = req.body;

    if (!title || !category || !description || startingBid === undefined || !endTime) {
      return res.status(400).json({ error: 'All fields (title, category, description, startingBid, endTime) are required' });
    }

    const numStartingBid = Number(startingBid);
    if (isNaN(numStartingBid) || numStartingBid <= 0) {
      return res.status(400).json({ error: 'Starting bid must be greater than zero' });
    }

    const endDateTime = new Date(endTime);
    if (isNaN(endDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }

    if (endDateTime.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Auction end time must be in the future' });
    }

    // Process uploaded image files
    const images = req.files && Array.isArray(req.files)
      ? req.files.map((f) => `/uploads/${f.filename}`)
      : [];

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
    return res.status(500).json({ error: error.message || 'Failed to create auction' });
  }
}

// PUT /api/auctions/:id - Update an auction (only if bidCount === 0 and user is seller)
export async function updateAuction(req, res) {
  try {
    const { id } = req.params;
    const { title, category, description, condition, startingBid, endTime } = req.body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Must be seller
    if (auction.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this auction' });
    }

    // Cannot edit if bids exist
    if (auction.bidCount > 0) {
      return res.status(403).json({ error: 'Listing is locked and cannot be edited after bids have been placed' });
    }

    if (startingBid !== undefined) {
      const numStartingBid = Number(startingBid);
      if (isNaN(numStartingBid) || numStartingBid <= 0) {
        return res.status(400).json({ error: 'Starting bid must be greater than zero' });
      }
      auction.startingBid = numStartingBid;
      auction.currentBid = numStartingBid;
    }

    if (endTime) {
      const endDateTime = new Date(endTime);
      if (isNaN(endDateTime.getTime()) || endDateTime.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Auction end time must be in the future' });
      }
      auction.endTime = endDateTime;
    }

    if (title) auction.title = title.trim();
    if (category) auction.category = category.trim();
    if (description) auction.description = description.trim();
    if (condition) auction.condition = condition;

    // Append new uploaded images if provided
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = req.files.map((f) => `/uploads/${f.filename}`);
      auction.images = [...auction.images, ...newImages].slice(0, 5);
    }

    await auction.save();

    return res.status(200).json({
      message: 'Auction updated successfully',
      auction,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update auction' });
  }
}

// DELETE /api/auctions/:id - Delete an auction (only if bidCount === 0 and user is seller)
export async function deleteAuction(req, res) {
  try {
    const { id } = req.params;
    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Must be seller or admin
    if (auction.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this auction' });
    }

    // Cannot delete if bids exist
    if (auction.bidCount > 0) {
      return res.status(403).json({ error: 'Listing cannot be deleted after bids have been placed' });
    }

    // Cleanup images on disk
    if (Array.isArray(auction.images)) {
      for (const imgUrl of auction.images) {
        try {
          const filename = path.basename(imgUrl);
          const filepath = path.join(import.meta.dirname, '../../uploads', filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch {
          // Ignore deletion error
        }
      }
    }

    await Auction.findByIdAndDelete(id);

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

    // Filter by status (default to 'live' unless explicitly queried)
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = 'live';
    }

    // Filter by seller (e.g. for Seller Dashboard "My Listings")
    if (req.query.sellerId) {
      filter.sellerId = req.query.sellerId;
    }

    // Category filter
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    // Price range filters
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.currentBid = {};
      if (req.query.minPrice !== undefined) {
        filter.currentBid.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined) {
        filter.currentBid.$lte = Number(req.query.maxPrice);
      }
    }

    // Keyword search (text search or regex fallback)
    if (req.query.search && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate('sellerId', 'displayName avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Auction.countDocuments(filter),
    ]);

    // Attach remaining seconds calculation
    const enriched = auctions.map((a) => {
      const remainingSeconds = Math.max(0, Math.floor((new Date(a.endTime).getTime() - Date.now()) / 1000));
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

    const auction = await Auction.findById(id)
      .populate('sellerId', 'displayName avatar email createdAt')
      .populate('highestBidderId', 'displayName')
      .lean();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(auction.endTime).getTime() - Date.now()) / 1000));

    return res.status(200).json({
      ...auction,
      timeRemainingSeconds: remainingSeconds,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch auction details' });
  }
}

