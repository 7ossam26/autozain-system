import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { contactRequestRateLimiter } from '../middleware/rateLimiter.js';
import {
  submitContactRequest, updateContactRequestHandler, completeContactRequest,
  getMyRequests,
} from '../controllers/contactRequestsController.js';

const router = Router();

// Public submission (no auth, rate-limited per IP)
router.post('/', contactRequestRateLimiter, submitContactRequest);

// Authenticated employee actions
router.patch('/:id',          authMiddleware, updateContactRequestHandler);
router.patch('/:id/complete', authMiddleware, completeContactRequest);
router.get('/me',             authMiddleware, getMyRequests);

export default router;
