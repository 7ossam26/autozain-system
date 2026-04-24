import { getSetting } from '../config/settingsCache.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  createSale, findSaleByCarId, listSales, getSaleStats, listSalesForExport,
} from '../repositories/saleRepository.js';
import { prisma } from '../config/db.js';
import { emitToEmployee, emitToRoom } from '../socket/index.js';
import { exportToExcel, exportToPdf } from '../services/exportService.js';

// POST /sales — CFO closes a sale
export async function closeSale(req, res, next) {
  try {
    const {
      car_id, final_sale_price, seller_received,
      employee_id, employee_commission,
      buyer_name, buyer_phone, payment_method, notes,
    } = req.body ?? {};

    if (!car_id || final_sale_price === undefined || seller_received === undefined || !buyer_name || !buyer_phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم العربية والسعر النهائي والمبلغ للبائع واسم المشتري ورقمه مطلوبين',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const finalPrice = parseInt(final_sale_price, 10);
    const sellerRec  = parseInt(seller_received, 10);

    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'السعر النهائي لازم يكون رقم صحيح أكبر من صفر',
        error_code: 'VALIDATION_ERROR',
      });
    }
    if (isNaN(sellerRec) || sellerRec < 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ للبائع لازم يكون رقم صحيح موجب',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const defaultCommission = Number(getSetting('default_commission') ?? 0);
    const commission = employee_commission !== undefined
      ? parseInt(employee_commission, 10)
      : defaultCommission;

    if (isNaN(commission) || commission < 0) {
      return res.status(400).json({
        success: false,
        message: 'العمولة لا يمكن أن تكون سالبة',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const car = await prisma.car.findUnique({ where: { id: car_id } });
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }
    if (car.status === 'available' || car.status === 'withdrawn') {
      return res.status(409).json({
        success: false,
        message: 'العربية لازم تكون في حالة عربون أو مباعة عشان تقفل البيعة',
        error_code: 'INVALID_STATE',
      });
    }

    const existingSale = await findSaleByCarId(car_id);
    if (existingSale) {
      return res.status(409).json({
        success: false,
        message: 'البيعة دي اتقفلت قبل كده',
        error_code: 'DUPLICATE_SALE',
      });
    }

    // Determine selling employee — provided or fall back to car's addedBy
    const actualEmployeeId = employee_id || car.addedBy;

    // Look up latest deposit amount for this car
    const latestDeposit = await prisma.depositRequest.findFirst({
      where: { carId: car_id, status: { in: ['confirmed', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });
    const depositAmount = latestDeposit?.depositAmount ?? 0;

    // Auto-calculations — all integer
    const dealershipRevenue = finalPrice - sellerRec;
    const taxPercentage     = Number(getSetting('tax_percentage') ?? 0);
    const taxAmount         = Math.round(dealershipRevenue * taxPercentage / 100);

    const sale = await createSale({
      carId: car_id,
      employeeId: actualEmployeeId,
      closedBy: req.user.userId,
      finalSalePrice: finalPrice,
      sellerReceived: sellerRec,
      dealershipRevenue,
      employeeCommission: commission,
      depositAmount,
      taxPercentage,
      taxAmount,
      buyerName: String(buyer_name).trim(),
      buyerPhone: String(buyer_phone).trim(),
      paymentMethod: payment_method ? String(payment_method).trim() : null,
      notes: notes ? String(notes).trim() : null,
      saleDate: new Date(),
    });

    // Transition car to sold
    await prisma.car.update({ where: { id: car_id }, data: { status: 'sold' } });
    emitToRoom('dashboard', 'car:status_changed', { carId: car_id, newStatus: 'sold' });

    await logAudit({
      entityType: 'sale',
      entityId: sale.id,
      action: 'create',
      newValue: { carId: car_id, finalSalePrice: finalPrice, dealershipRevenue, taxAmount },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    // Notify the selling employee (unless the CFO is also the employee)
    if (actualEmployeeId !== req.user.userId) {
      emitToEmployee(actualEmployeeId, 'sale:closed', {
        saleId: sale.id,
        car: { id: car.id, carType: car.carType, model: car.model },
        finalSalePrice: finalPrice,
        employeeCommission: commission,
      });
    }

    return res.status(201).json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
}

// GET /sales/pending — cars at deposit_paid/sold with no sale record yet
export async function getPendingSales(req, res, next) {
  try {
    const cars = await prisma.car.findMany({
      where: {
        status: { in: ['deposit_paid', 'sold'] },
        sales: { none: {} },
      },
      include: {
        addedByUser: { select: { id: true, fullName: true } },
        deposits: {
          where: { status: { in: ['pending', 'confirmed'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, depositAmount: true, buyerName: true, buyerPhone: true, status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
}

// GET /sales/stats
export async function getSalesStats(req, res, next) {
  try {
    const stats = await getSaleStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// GET /sales — list sales with filters + pagination
export async function getSales(req, res, next) {
  try {
    const { start_date, end_date, employee_id, car_type, page = '1', limit = '20' } = req.query;
    const result = await listSales({
      startDate:  start_date  || undefined,
      endDate:    end_date    || undefined,
      employeeId: employee_id || undefined,
      carType:    car_type    || undefined,
      page:  parseInt(page,  10),
      limit: parseInt(limit, 10),
    });
    return res.json({
      success: true,
      data: result.sales,
      meta: { total: result.total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /sales/export/excel
export async function exportSalesExcel(req, res, next) {
  try {
    const { start_date, end_date, employee_id, car_type, columns } = req.query;
    const sales = await listSalesForExport({
      startDate:  start_date  || undefined,
      endDate:    end_date    || undefined,
      employeeId: employee_id || undefined,
      carType:    car_type    || undefined,
    });

    const selectedColumns = columns ? String(columns).split(',').map((c) => c.trim()) : null;
    const buffer = await exportToExcel(sales, selectedColumns);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="autozain-sales-${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// GET /sales/export/pdf
export async function exportSalesPdf(req, res, next) {
  try {
    const { start_date, end_date, employee_id, car_type, columns } = req.query;
    const sales = await listSalesForExport({
      startDate:  start_date  || undefined,
      endDate:    end_date    || undefined,
      employeeId: employee_id || undefined,
      carType:    car_type    || undefined,
    });

    const selectedColumns = columns ? String(columns).split(',').map((c) => c.trim()) : null;
    const buffer = await exportToPdf(sales, selectedColumns);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="autozain-sales-${Date.now()}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}
