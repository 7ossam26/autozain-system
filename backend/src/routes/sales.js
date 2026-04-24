import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import {
  closeSale, getPendingSales, getSalesStats,
  getSales, exportSalesExcel, exportSalesPdf,
} from '../controllers/saleController.js';

const router = Router();

router.use(authMiddleware);

// Specific routes must come before /:id-style generics
router.get('/pending',        rbacMiddleware('financial_view'),      getPendingSales);
router.get('/stats',          rbacMiddleware('financial_view'),      getSalesStats);
router.get('/export/excel',   rbacMiddleware('reports_export'),      exportSalesExcel);
router.get('/export/pdf',     rbacMiddleware('reports_export'),      exportSalesPdf);
router.get('/',               rbacMiddleware('financial_view'),      getSales);
router.post('/',              rbacMiddleware('financial_close_sale'), closeSale);

export default router;
