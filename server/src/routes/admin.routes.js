import { Router } from 'express';
import {
  getAnalytics,
  getUsers,
  suspendUser,
  reactivateUser,
  getAdminAuctions,
  deleteAdminAuction,
  flagAuction,
  terminateAuction,
  getAdminDisputes,
  resolveDispute,
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

router.get('/auctions', getAdminAuctions);
router.delete('/auctions/:id', deleteAdminAuction);
router.patch('/auctions/:id/flag', flagAuction);
router.post('/auctions/:id/terminate', terminateAuction);

router.get('/disputes', getAdminDisputes);
router.patch('/disputes/:id/resolve', resolveDispute);

router.post('/announcements', createAnnouncement);

export default router;

