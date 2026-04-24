import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import permissionsRouter from './permissions.js';
import carsRouter from './cars.js';
import settingsRouter from './settings.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth',        authRouter);
router.use('/users',       usersRouter);
router.use('/permissions', permissionsRouter);
router.use('/cars',        carsRouter);
router.use('/settings',    settingsRouter);

// Phase 3+:
// router.use('/public', publicRouter);
// Phase 4+:
// router.use('/contact-requests', contactRequestsRouter);
// router.use('/queue', queueRouter);
// Phase 5+:
// router.use('/deposits', depositsRouter);
// router.use('/sales', salesRouter);

export default router;
