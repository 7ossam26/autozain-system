import { logAudit } from '../utils/auditLogger.js';
import { requireWholeEgp } from '../utils/financial.js';
import {
  createDepositRequest, findDepositById, listDeposits,
  updateDeposit, findPendingDepositForCar,
} from '../repositories/depositRepository.js';
import { prisma } from '../config/db.js';
import { emitToRoom } from '../socket/index.js';

// POST /deposits — employee submits deposit request
export async function submitDeposit(req, res, next) {
  try {
    const { car_id, deposit_amount, buyer_name, buyer_phone, notes } = req.body ?? {};

    if (!car_id || deposit_amount === undefined || !buyer_name || !buyer_phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم العربية ومبلغ العربون واسم المشتري ورقمه مطلوبين',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const amount = requireWholeEgp(deposit_amount, { min: 1 });
    if (amount === null) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ العربون لازم يكون رقم صحيح أكبر من صفر',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const car = await prisma.car.findUnique({ where: { id: car_id } });
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }
    if (car.status !== 'deposit_paid') {
      return res.status(409).json({
        success: false,
        message: 'العربية لازم تكون في حالة عربون عشان تسجّل العربون',
        error_code: 'INVALID_STATE',
      });
    }

    const existing = await findPendingDepositForCar(car_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'في طلب عربون معلق لنفس العربية',
        error_code: 'DUPLICATE_DEPOSIT',
      });
    }

    const deposit = await createDepositRequest({
      carId: car_id,
      employeeId: req.user.userId,
      depositAmount: amount,
      buyerName: String(buyer_name).trim(),
      buyerPhone: String(buyer_phone).trim(),
      notes: notes ? String(notes).trim() : null,
    });

    await logAudit({
      entityType: 'deposit',
      entityId: deposit.id,
      action: 'create',
      newValue: { carId: car_id, depositAmount: amount, status: 'pending' },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    emitToRoom('role:cfo', 'deposit:submitted', {
      depositId: deposit.id,
      carId: car_id,
      car: deposit.car,
      depositAmount: amount,
      buyerName: deposit.buyerName,
      employeeName: deposit.employee?.fullName,
    });

    return res.status(201).json({ success: true, data: deposit });
  } catch (err) {
    next(err);
  }
}

// GET /deposits — list deposits (filterable by status)
export async function getDeposits(req, res, next) {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const validStatuses = ['pending', 'confirmed', 'rejected', 'refunded'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صحيحة',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const result = await listDeposits({
      status: status || undefined,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result.deposits,
      meta: { total: result.total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /deposits/:id — CFO confirms or rejects
export async function updateDepositHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { action, notes } = req.body ?? {};

    if (!['confirm', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'الإجراء لازم يكون confirm أو reject',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const deposit = await findDepositById(id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'طلب العربون مش موجود', error_code: 'NOT_FOUND' });
    }
    if (deposit.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'طلب العربون مش في حالة انتظار',
        error_code: 'INVALID_STATE',
      });
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';

    const updated = await updateDeposit(id, {
      status: newStatus,
      confirmedBy: req.user.userId,
      confirmedAt: new Date(),
      ...(notes ? { notes: String(notes).trim() } : {}),
    });

    // If rejected, revert car to available
    if (action === 'reject') {
      const car = await prisma.car.findUnique({ where: { id: deposit.carId } });
      if (car?.status === 'deposit_paid') {
        await prisma.car.update({ where: { id: deposit.carId }, data: { status: 'available' } });
        emitToRoom('dashboard', 'car:status_changed', { carId: deposit.carId, newStatus: 'available' });
      }
    }

    await logAudit({
      entityType: 'deposit',
      entityId: id,
      action: 'update',
      oldValue: { status: 'pending' },
      newValue: { status: newStatus },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
