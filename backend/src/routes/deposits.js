import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import {
  submitDeposit, getDeposits, updateDepositHandler,
} from '../controllers/depositController.js';

const router = Router();

router.use(authMiddleware);

router.post('/',     rbacMiddleware('cars_change_status'), submitDeposit);
router.get('/',      rbacMiddleware('financial_view'),     getDeposits);
router.patch('/:id', rbacMiddleware('financial_close_sale'), updateDepositHandler);

export default router;
