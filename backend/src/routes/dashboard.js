import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = Router();

router.use(authMiddleware);

// Only SuperAdmin and Admin see full stats (checked on frontend + loosely here)
router.get('/stats', getDashboardStats);

export default router;
