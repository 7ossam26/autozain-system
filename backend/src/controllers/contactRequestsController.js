import { prisma } from '../config/db.js';
import {
  createContactRequest, findContactRequestById, updateContactRequest,
} from '../repositories/contactRequestRepository.js';
import { findUserById, setUserStatus } from '../repositories/userRepository.js';
import { getSetting } from '../config/settingsCache.js';
import { looksLikeEgyptianMobile } from '../utils/validators.js';
import { emitToAll, emitToEmployee, emitToRoom } from '../socket/index.js';
import { sendPush } from '../services/notificationService.js';
import { scheduleRepeatNotification } from '../services/contactRequestService.js';
import { tryAssignFromQueue } from '../services/queueService.js';
import { logAudit } from '../utils/auditLogger.js';

const VALID_OUTCOMES = new Set(['sold', 'interested', 'no_answer', 'cancelled']);

// ─── POST /contact-requests (public, no auth) ────────────────────────────────

export async function submitContactRequest(req, res, next) {
  try {
    const { buyer_name, buyer_phone, employee_id, car_id } = req.body ?? {};

    if (!buyer_name || !buyer_phone || !employee_id) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ورقم الموبايل والموظف مطلوبين',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const buyerCanAttach = getSetting('buyer_can_attach_car') === true;
    const interestedCarId = buyerCanAttach ? (car_id || null) : null;

    const employee = await findUserById(employee_id);
    if (!employee || !employee.isActive || employee.role?.name !== 'employee') {
      return res.status(404).json({
        success: false, message: 'الموظف مش موجود', error_code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    if (employee.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: 'الموظف مش متاح دلوقتي — جرّب موظف تاني',
        error_code: 'EMPLOYEE_NOT_AVAILABLE',
      });
    }

    const request = await createContactRequest({
      buyerName: String(buyer_name).trim(),
      buyerPhone: String(buyer_phone).trim(),
      employeeId: employee_id,
      interestedCarId,
    });

    // Notify target employee
    emitToEmployee(employee_id, 'contact_request:new', {
      requestId: request.id,
      buyerName: request.buyerName,
      buyerPhone: request.buyerPhone,
      interestedCar: request.interestedCar,
    });

    sendPush(employee_id, {
      title: 'طلب تواصل جديد',
      body: `${request.buyerName} — ${request.buyerPhone}`,
      tag: `request-${request.id}`,
      data: { requestId: request.id, type: 'new' },
    }).catch(() => {});

    // Repeat notification after 60s if no response
    scheduleRepeatNotification(request);

    const phoneWarning = !looksLikeEgyptianMobile(buyer_phone)
      ? 'رقم الهاتف ممكن يكون غلط — راجعه'
      : null;

    const timeoutMinutes = Number(getSetting('request_timeout_minutes') ?? 5);

    return res.status(201).json({
      success: true,
      data: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        timeoutMinutes,
      },
      ...(phoneWarning && { warning: phoneWarning }),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /contact-requests/:id (auth — employee actions) ───────────────────

export async function updateContactRequestHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body ?? {};

    const request = await findContactRequestById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب مش موجود', error_code: 'NOT_FOUND' });
    }

    // Only the target employee (or admin/superadmin) can act on it.
    const isTarget = request.employeeId === req.user.userId;
    const isAdmin = ['superadmin', 'admin'].includes(req.user.roleName);
    if (!isTarget && !isAdmin) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية', error_code: 'FORBIDDEN' });
    }

    if (action === 'accept') {
      if (request.status !== 'pending') {
        return res.status(409).json({
          success: false,
          message: 'الطلب مش pending',
          error_code: 'INVALID_STATE',
        });
      }
      const updated = await updateContactRequest(id, {
        status: 'accepted',
        acceptedAt: new Date(),
      });
      await setUserStatus(request.employeeId, 'busy');

      emitToAll('employee:status_changed', { employeeId: request.employeeId, status: 'busy' });
      emitToEmployee(request.employeeId, 'contact_request:accepted', { requestId: id });

      await logAudit({
        entityType: 'contact_request', entityId: id, action: 'accept',
        performedBy: req.user.userId, ipAddress: req.ip,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'reject') {
      if (request.status !== 'pending') {
        return res.status(409).json({
          success: false, message: 'الطلب مش pending', error_code: 'INVALID_STATE',
        });
      }
      const updated = await updateContactRequest(id, { status: 'rejected' });
      emitToEmployee(request.employeeId, 'contact_request:rejected', { requestId: id });

      await logAudit({
        entityType: 'contact_request', entityId: id, action: 'reject',
        performedBy: req.user.userId, ipAddress: req.ip,
      });

      return res.json({ success: true, data: updated });
    }

    return res.status(400).json({
      success: false,
      message: 'action غير صالح (accept | reject)',
      error_code: 'VALIDATION_ERROR',
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /contact-requests/:id/complete ────────────────────────────────────

export async function completeContactRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { outcome } = req.body ?? {};

    const request = await findContactRequestById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب مش موجود', error_code: 'NOT_FOUND' });
    }

    const isTarget = request.employeeId === req.user.userId;
    const isAdmin = ['superadmin', 'admin'].includes(req.user.roleName);
    if (!isTarget && !isAdmin) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية', error_code: 'FORBIDDEN' });
    }

    if (request.status !== 'accepted') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن إنهاء طلب غير مقبول',
        error_code: 'INVALID_STATE',
      });
    }

    const outcomeValue = outcome && VALID_OUTCOMES.has(outcome) ? outcome : null;

    const updated = await updateContactRequest(id, {
      status: 'completed',
      completedAt: new Date(),
      outcome: outcomeValue,
    });

    // If this was the employee's only active session, flip them back to available.
    const otherActive = await prisma.contactRequest.count({
      where: { employeeId: request.employeeId, status: 'accepted', id: { not: id } },
    });
    if (otherActive === 0) {
      await setUserStatus(request.employeeId, 'available');
      emitToAll('employee:status_changed', {
        employeeId: request.employeeId, status: 'available',
      });
      // Auto-assign oldest queue entry if any
      await tryAssignFromQueue(request.employeeId).catch(() => {});
    }

    emitToEmployee(request.employeeId, 'session:ended', { requestId: id, outcome: outcomeValue });
    emitToRoom('role:team_manager', 'session:ended', {
      requestId: id, employeeId: request.employeeId, outcome: outcomeValue,
    });

    await logAudit({
      entityType: 'contact_request', entityId: id, action: 'complete',
      newValue: { outcome: outcomeValue },
      performedBy: req.user.userId, ipAddress: req.ip,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ─── GET /contact-requests/me (authed — current user's sessions) ─────────────

export async function getMyRequests(req, res, next) {
  try {
    const pending = await prisma.contactRequest.findMany({
      where: { employeeId: req.user.userId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    const active = await prisma.contactRequest.findMany({
      where: { employeeId: req.user.userId, status: 'accepted' },
      orderBy: { acceptedAt: 'desc' },
      include: {
        interestedCar: { select: { id: true, carType: true, model: true, status: true } },
      },
    });
    return res.json({ success: true, data: { pending, active } });
  } catch (err) {
    next(err);
  }
}
