import express from 'express';
import {
  getProfile,
  updateProfile,
  getUserBids,
  getUserWonAuctions,
} from '../controllers/user.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/bids', authenticate, getUserBids);
router.get('/won', authenticate, getUserWonAuctions);

export default router;
