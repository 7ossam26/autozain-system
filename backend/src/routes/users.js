import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import {
  getUsers, getRoles,
  createUserHandler, updateUserHandler,
  resetPasswordHandler, deleteUserHandler,
  updateMyStatus, getEmployeeMonitor, getTeamStats,
} from '../controllers/userController.js';

const router = Router();

router.use(authMiddleware);

// Self-service — any authenticated user
router.patch('/me/status', updateMyStatus);

// Monitor + team stats — employee_monitor permission
router.get('/monitor',    rbacMiddleware('employee_monitor'), getEmployeeMonitor);
router.get('/team-stats', rbacMiddleware('employee_monitor'), getTeamStats);

router.get('/',              rbacMiddleware('users_view'),   getUsers);
router.get('/roles',         rbacMiddleware('users_view'),   getRoles);
router.post('/',             rbacMiddleware('users_create'), createUserHandler);
router.put('/:id',           rbacMiddleware('users_edit'),   updateUserHandler);
router.post('/:id/password', rbacMiddleware('users_edit'),   resetPasswordHandler);
router.delete('/:id',        rbacMiddleware('users_delete'), deleteUserHandler);

export default router;
