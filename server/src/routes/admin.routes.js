import { Router } from 'express';
import { createAnnouncement } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = Router();

// Protect all admin endpoints with authentication and admin role authorization
router.use(authenticate, requireAdmin);

router.post('/announcements', createAnnouncement);

export default router;
