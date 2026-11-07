import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login/recovery requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication requests from this IP. Please try again after 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit each IP to 10 register attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration requests from this IP. Please try again after 15 minutes.' },
});

router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
