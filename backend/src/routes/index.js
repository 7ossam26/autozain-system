import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import permissionsRouter from './permissions.js';
import carsRouter from './cars.js';
import settingsRouter from './settings.js';
import publicRouter from './public.js';
import contactRequestsRouter from './contactRequests.js';
import queueRouter from './queue.js';
import pushRouter from './push.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth',             authRouter);
router.use('/users',             usersRouter);
router.use('/permissions',       permissionsRouter);
router.use('/cars',              carsRouter);
router.use('/settings',          settingsRouter);
router.use('/public',            publicRouter);
router.use('/contact-requests',  contactRequestsRouter);
router.use('/queue',             queueRouter);
router.use('/push',              pushRouter);
// Phase 5+:
// router.use('/deposits', depositsRouter);
// router.use('/sales', salesRouter);

export default router;
