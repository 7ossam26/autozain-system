// API v1 root router. Sub-routers are mounted here as phases land.

import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Phase 1+:
// router.use('/auth', authRouter);
// router.use('/users', usersRouter);
// Phase 2+:
// router.use('/cars', carsRouter);
// router.use('/settings', settingsRouter);
// Phase 3+:
// router.use('/public', publicRouter);
// Phase 4+:
// router.use('/contact-requests', contactRequestsRouter);
// router.use('/queue', queueRouter);
// Phase 5+:
// router.use('/deposits', depositsRouter);
// router.use('/sales', salesRouter);

export default router;
