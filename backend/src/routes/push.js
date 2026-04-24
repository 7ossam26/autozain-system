import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getVapidKey, subscribe, unsubscribe } from '../controllers/pushController.js';

const router = Router();

// VAPID public key is safe to expose (needed by the browser to subscribe).
router.get('/public-key', getVapidKey);

router.post('/subscribe',   authMiddleware, subscribe);
router.delete('/subscribe', authMiddleware, unsubscribe);

export default router;
