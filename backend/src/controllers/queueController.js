import { prisma } from '../config/db.js';
import {
  enqueueBuyer, listWaitingQueue, expireQueueEntry,
} from '../repositories/queueRepository.js';
import { getSetting } from '../config/settingsCache.js';
import { looksLikeEgyptianMobile } from '../utils/validators.js';
import { emitToRoom } from '../socket/index.js';

// POST /queue — buyer joins the queue when all employees busy.
export async function joinQueue(req, res, next) {
  try {
    const { buyer_name, buyer_phone, car_id } = req.body ?? {};

    if (!buyer_name || !buyer_phone) {
      return res.status(400).json({
        success: false, message: 'الاسم ورقم الموبايل مطلوبين', error_code: 'VALIDATION_ERROR',
      });
    }

    // Sanity: block queueing if at least one employee is actually available.
    const availableCount = await prisma.user.count({
      where: { isActive: true, status: 'available', role: { name: 'employee' } },
    });
    if (availableCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'في موظف متاح دلوقتي — ارجع لصفحة الموظفين',
        error_code: 'EMPLOYEES_AVAILABLE',
      });
    }

    const buyerCanAttach = getSetting('buyer_can_attach_car') === true;
    const entry = await enqueueBuyer({
      buyerName: String(buyer_name).trim(),
      buyerPhone: String(buyer_phone).trim(),
      interestedCarId: buyerCanAttach ? (car_id || null) : null,
    });

    emitToRoom('role:team_manager', 'queue:updated', { id: entry.id, status: 'waiting' });

    const warning = !looksLikeEgyptianMobile(buyer_phone)
      ? 'رقم الهاتف ممكن يكون غلط — راجعه'
      : null;

    return res.status(201).json({
      success: true,
      data: { id: entry.id, status: entry.status, createdAt: entry.createdAt },
      ...(warning && { warning }),
    });
  } catch (err) {
    next(err);
  }
}

// GET /queue — dashboard view (team_manager / admin) of the waiting queue.
export async function getQueue(req, res, next) {
  try {
    const entries = await listWaitingQueue();
    return res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

// DELETE /queue/:id — buyer leaves the queue (public) or admin removes.
export async function leaveQueue(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await expireQueueEntry(id).catch(() => null);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'المدخل مش موجود', error_code: 'NOT_FOUND' });
    }
    emitToRoom('role:team_manager', 'queue:updated', { id: entry.id, status: 'expired' });
    return res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}
