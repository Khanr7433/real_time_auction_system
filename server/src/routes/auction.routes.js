import { Router } from 'express';
import {
  createAuction,
  updateAuction,
  deleteAuction,
  getAuctions,
  getAuctionById,
  getAuctionBids,
} from '../controllers/auction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  uploadAuctionImages,
  handleUploadErrors,
  validateUploadedImages,
} from '../middleware/upload.middleware.js';
import { Auction } from '../models/Auction.js';
import { isValidObjectId } from '../utils/validation.js';

const router = Router();

async function ensureEditableAuction(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid auction identifier' });
    }

    const auction = await Auction.findById(id).select('sellerId bidCount status').lean();
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this auction' });
    }

    if (auction.bidCount > 0) {
      return res.status(403).json({ error: 'Listing is locked and cannot be edited after bids have been placed' });
    }

    if (auction.status !== 'live' && auction.status !== 'pending') {
      return res.status(403).json({ error: 'Closed listings cannot be edited' });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

function handleAuctionUpload(req, res, next) {
  uploadAuctionImages(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    return validateUploadedImages(req, res, next);
  });
}

// Public routes
router.get('/', getAuctions);
router.get('/:id', getAuctionById);
router.get('/:id/bids', getAuctionBids);

// Protected routes (require auth)
router.post('/', authenticate, handleAuctionUpload, createAuction);
router.put('/:id', authenticate, ensureEditableAuction, handleAuctionUpload, updateAuction);
router.delete('/:id', authenticate, deleteAuction);

export default router;
