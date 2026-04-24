import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { carCreateUpload } from '../middleware/upload.js';
import {
  getCars, getCarById, addCar, editCar, changeCarStatus, removeCar,
} from '../controllers/carController.js';

const router = Router();

router.use(authMiddleware);

router.get('/',     rbacMiddleware('cars_view'),         getCars);
router.get('/:id',  rbacMiddleware('cars_view'),         getCarById);
router.post('/',    rbacMiddleware('cars_add'),          carCreateUpload, addCar);
router.put('/:id',  rbacMiddleware('cars_edit'),         carCreateUpload, editCar);
router.patch('/:id/status', rbacMiddleware('cars_change_status'), changeCarStatus);
router.delete('/:id', rbacMiddleware('cars_delete'),     removeCar);

export default router;
