import express from 'express';
import * as authController from '../controllers/authController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public auth endpoints
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected auth endpoints
router.get('/me', verifyToken, authController.me);
router.post('/logout', verifyToken, authController.logout);
router.post('/change-password', verifyToken, authController.changePassword);

// Admin-only management endpoints
router.get('/admins', verifyToken, isAdmin, authController.listAdmins);
router.post('/admins', verifyToken, isAdmin, authController.addAdmin);
router.delete('/admins/:id', verifyToken, isAdmin, authController.removeAdmin);

export default router;
