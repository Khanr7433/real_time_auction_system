import { Router } from 'express';
import { createDispute } from '../controllers/dispute.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

// Protected route: file a new dispute
router.post('/', authenticate, createDispute);

export default router;
