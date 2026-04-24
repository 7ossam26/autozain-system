import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { getSettings, putSetting } from '../controllers/settingsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/',       rbacMiddleware('settings_view'), getSettings);
router.put('/:key',   rbacMiddleware('settings_edit'), putSetting);

export default router;
