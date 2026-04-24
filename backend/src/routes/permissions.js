import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { getPermissionsMatrix, updatePermission } from '../controllers/permissionsController.js';

const router = Router();

router.use(authMiddleware);
router.use(rbacMiddleware('permissions_manage'));

router.get('/',                        getPermissionsMatrix);
router.patch('/:roleId/:moduleKey',    updatePermission);

export default router;
