import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { carCreateUpload } from '../middleware/upload.js';
import {
  getCars, getCarById, addCar, editCar, changeCarStatus, removeCar,
  getArchive, exportCars, importCarsHandler,
} from '../controllers/carController.js';

const router = Router();

router.use(authMiddleware);

// Archive + export + import (specific paths before /:id)
router.get('/archive', rbacMiddleware('archive_view'), getArchive);
router.get('/export',  rbacMiddleware('cars_view'),    exportCars);
router.post('/import', rbacMiddleware('cars_add'),     importCarsHandler);

router.get('/',     rbacMiddleware('cars_view'),         getCars);
router.get('/:id',  rbacMiddleware('cars_view'),         getCarById);
router.post('/',    rbacMiddleware('cars_add'),          carCreateUpload, addCar);
router.put('/:id',  rbacMiddleware('cars_edit'),         carCreateUpload, editCar);
router.patch('/:id/status', rbacMiddleware('cars_change_status'), changeCarStatus);
router.delete('/:id', rbacMiddleware('cars_delete'),     removeCar);

export default router;
