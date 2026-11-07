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
import { uploadAuctionImages, handleUploadErrors } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', getAuctions);
router.get('/:id', getAuctionById);
router.get('/:id/bids', getAuctionBids);

// Protected routes (require auth)
router.post(
  '/',
  authenticate,
  (req, res, next) => {
    uploadAuctionImages(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  createAuction
);

router.put(
  '/:id',
  authenticate,
  (req, res, next) => {
    uploadAuctionImages(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  updateAuction
);

router.delete('/:id', authenticate, deleteAuction);

export default router;

