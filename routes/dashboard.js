import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', verifyToken, isAdmin, dashboardController.getStats);

export default router;
