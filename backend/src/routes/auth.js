import { Router } from 'express';
import { login, logout, me, refreshToken } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login',         loginRateLimiter, login);
router.post('/logout',        logout);
router.get('/me',             authMiddleware, me);
router.post('/refresh-token', refreshToken);

export default router;
