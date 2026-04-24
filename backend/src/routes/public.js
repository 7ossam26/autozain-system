import { Router } from 'express';
import {
  getPublicCars, getPublicCarById, getPublicNumeralSystem, getPublicEmployees,
} from '../controllers/publicController.js';

const router = Router();

// No auth — these endpoints are open to the public.
router.get('/cars',                    getPublicCars);
router.get('/cars/:id',                getPublicCarById);
router.get('/employees',               getPublicEmployees);
router.get('/settings/numeral_system', getPublicNumeralSystem);

export default router;
