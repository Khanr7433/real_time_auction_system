import { Dispute } from '../models/Dispute.js';
import { Auction } from '../models/Auction.js';
import { isValidObjectId } from '../utils/validation.js';

// POST /api/disputes - File a dispute regarding an auction or user
export async function createDispute(req, res, next) {
  try {
    const { auctionId, title, description } = req.body || {};
    const reporterId = req.user._id;

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Dispute description is required' });
    }

    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({ error: 'Dispute title must be a string' });
    }

    let reportedUserId = null;
    let auctionTitle = '';

    if (auctionId !== undefined && auctionId !== null && auctionId !== '') {
      if (!isValidObjectId(auctionId)) {
        return res.status(400).json({ error: 'Invalid auction identifier' });
      }

      const auction = await Auction.findById(auctionId);
      if (!auction) {
        return res.status(404).json({ error: 'Referenced auction not found' });
      }

      auctionTitle = auction.title;
      if (auction.sellerId.toString() === reporterId.toString()) {
        reportedUserId = auction.highestBidderId || null;
      } else {
        reportedUserId = auction.sellerId;
      }
    }

    const dispute = await Dispute.create({
      reporterId,
      reportedUserId,
      auctionId: auctionId || null,
      title: title?.trim() || (auctionTitle ? `Dispute on "${auctionTitle}"` : 'User Dispute'),
      description: description.trim(),
      status: 'open',
    });

    return res.status(201).json({
      message: 'Dispute submitted successfully and queued for administrative review',
      dispute,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createDispute,
};
