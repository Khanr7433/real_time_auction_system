import { Dispute } from '../models/Dispute.js';
import { Auction } from '../models/Auction.js';

// POST /api/disputes - File a dispute regarding an auction or user
export async function createDispute(req, res, next) {
  try {
    const { auctionId, title, description } = req.body;
    const reporterId = req.user._id;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Dispute description is required' });
    }

    let reportedUserId = null;
    let auctionTitle = '';

    if (auctionId) {
      const auction = await Auction.findById(auctionId);
      if (auction) {
        auctionTitle = auction.title;
        // If reporter is the seller, report highest bidder; else report seller
        if (auction.sellerId.toString() === reporterId.toString()) {
          reportedUserId = auction.highestBidderId || null;
        } else {
          reportedUserId = auction.sellerId;
        }
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
