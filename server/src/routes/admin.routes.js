import { Router } from 'express';
import {
  getAnalytics,
  getUsers,
  suspendUser,
  reactivateUser,
  createAnnouncement,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = Router();

// Protect all admin endpoints with authentication and admin role authorization
router.use(authenticate, requireAdmin);

router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/reactivate', reactivateUser);
router.post('/announcements', createAnnouncement);

export default router;

