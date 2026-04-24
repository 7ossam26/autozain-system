import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { queueRateLimiter } from '../middleware/rateLimiter.js';
import { joinQueue, getQueue, leaveQueue } from '../controllers/queueController.js';

const router = Router();

// Public — buyer joins queue
router.post('/', queueRateLimiter, joinQueue);

// Authenticated — dashboard view (team_manager / admin via employee_monitor)
router.get('/', authMiddleware, rbacMiddleware('employee_monitor'), getQueue);

// Public leave / admin cancel
router.delete('/:id', leaveQueue);

export default router;
