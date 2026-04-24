import bcrypt from 'bcrypt';
import {
  listUsers, findUserById, createUser, updateUser,
  updateUserPassword, deleteUser, setUserStatus,
  listEmployeesForMonitor,
} from '../repositories/userRepository.js';
import { listRoles, findRoleByName } from '../repositories/roleRepository.js';
import { logAudit } from '../utils/auditLogger.js';
import { emitToAll } from '../socket/index.js';
import { tryAssignFromQueue } from '../services/queueService.js';
import { prisma } from '../config/db.js';

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    status: user.status,
    isActive: user.isActive,
    maxConcurrent: user.maxConcurrent,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    role: { id: user.roleId, name: user.role.name, displayNameAr: user.role.displayNameAr },
  };
}

export async function getUsers(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const { users, total } = await listUsers({ page, limit });
    return res.json({
      success: true,
      data: users.map(formatUser),
      meta: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRoles(req, res, next) {
  try {
    const roles = await listRoles();
    return res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req, res, next) {
  try {
    const { username, password, fullName, roleId } = req.body ?? {};

    if (!username || !password || !fullName || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم وكلمة المرور والاسم الكامل والدور مطلوبين',
        error_code: 'VALIDATION_ERROR',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور لازم تكون 6 حروف على الأقل',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      username: username.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim(),
      roleId,
      createdBy: req.user.userId,
    });

    await logAudit({
      entityType: 'user',
      entityId: user.id,
      action: 'create',
      newValue: { username: user.username, roleId },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: formatUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'اسم المستخدم موجود بالفعل',
        error_code: 'DUPLICATE_USERNAME',
      });
    }
    next(err);
  }
}

export async function updateUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, roleId, isActive, maxConcurrent } = req.body ?? {};

    const existing = await findUserById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم مش موجود', error_code: 'NOT_FOUND' });
    }

    const superadminRole = await findRoleByName('superadmin');
    if (existing.roleId === superadminRole?.id && roleId && roleId !== superadminRole?.id) {
      return res.status(403).json({
        success: false,
        message: 'مش ممكن تغيير دور مدير النظام',
        error_code: 'FORBIDDEN',
      });
    }

    const user = await updateUser(id, { fullName, roleId, isActive, maxConcurrent });

    await logAudit({
      entityType: 'user',
      entityId: id,
      action: 'update',
      oldValue: { fullName: existing.fullName, roleId: existing.roleId, isActive: existing.isActive },
      newValue: { fullName, roleId, isActive, maxConcurrent },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body ?? {};

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة لازم تكون 6 حروف على الأقل',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const existing = await findUserById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم مش موجود', error_code: 'NOT_FOUND' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await updateUserPassword(id, passwordHash);

    await logAudit({
      entityType: 'user',
      entityId: id,
      action: 'reset_password',
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// PATCH /users/me/status — employee self-toggle between 'available' and 'offline'.
export async function updateMyStatus(req, res, next) {
  try {
    const { status } = req.body ?? {};
    if (!['available', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'الحالة لازم تكون available أو offline',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const current = await findUserById(req.user.userId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'المستخدم مش موجود', error_code: 'NOT_FOUND' });
    }

    // Can't manually go available while a session is still open — business rule.
    if (status === 'offline') {
      const activeSessions = await prisma.contactRequest.count({
        where: { employeeId: current.id, status: 'accepted' },
      });
      if (activeSessions > 0) {
        return res.status(409).json({
          success: false,
          message: 'عندك جلسة شغالة — اقفلها قبل ما تروح offline',
          error_code: 'ACTIVE_SESSION',
        });
      }
    }

    await setUserStatus(current.id, status);

    emitToAll('employee:status_changed', { employeeId: current.id, status });

    // Becoming available → try pulling the oldest queued buyer.
    if (status === 'available' && current.role.name === 'employee') {
      tryAssignFromQueue(current.id).catch(() => {});
    }

    return res.json({ success: true, data: { status } });
  } catch (err) {
    next(err);
  }
}

// GET /users/monitor — team-manager view of all employees (auth + rbac).
export async function getEmployeeMonitor(req, res, next) {
  try {
    const employees = await listEmployeesForMonitor();
    // Attach current active session info per employee.
    const activeSessions = await prisma.contactRequest.findMany({
      where: { status: 'accepted', employeeId: { in: employees.map((e) => e.id) } },
      select: {
        id: true, buyerName: true, buyerPhone: true, employeeId: true, acceptedAt: true,
        interestedCar: { select: { id: true, carType: true, model: true } },
      },
    });
    const byEmployee = {};
    for (const s of activeSessions) {
      (byEmployee[s.employeeId] = byEmployee[s.employeeId] || []).push(s);
    }
    const enriched = employees.map((e) => ({
      ...e,
      activeSessions: byEmployee[e.id] ?? [],
    }));
    // Also include queue depth for context.
    const queueWaiting = await prisma.buyerQueue.count({ where: { status: 'waiting' } });
    return res.json({ success: true, data: { employees: enriched, queueWaiting } });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await findUserById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم مش موجود', error_code: 'NOT_FOUND' });
    }

    if (existing.role.name === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'مش ممكن تمسح مدير النظام',
        error_code: 'FORBIDDEN',
      });
    }

    await deleteUser(id);

    await logAudit({
      entityType: 'user',
      entityId: id,
      action: 'delete',
      oldValue: { username: existing.username },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// GET /users/team-stats — employee performance aggregates
export async function getTeamStats(req, res, next) {
  try {
    const employees = await listEmployeesForMonitor();

    const employeeIds = employees.map((e) => e.id);

    const [totals, accepted, rejected] = await Promise.all([
      prisma.contactRequest.groupBy({
        by: ['employeeId'],
        _count: { id: true },
        where: { employeeId: { in: employeeIds } },
      }),
      prisma.contactRequest.groupBy({
        by: ['employeeId'],
        _count: { id: true },
        where: {
          employeeId: { in: employeeIds },
          status: { in: ['accepted', 'completed'] },
        },
      }),
      prisma.contactRequest.groupBy({
        by: ['employeeId'],
        _count: { id: true },
        where: { employeeId: { in: employeeIds }, status: 'rejected' },
      }),
    ]);

    const totalsMap   = Object.fromEntries(totals.map((r) => [r.employeeId, r._count.id]));
    const acceptedMap = Object.fromEntries(accepted.map((r) => [r.employeeId, r._count.id]));
    const rejectedMap = Object.fromEntries(rejected.map((r) => [r.employeeId, r._count.id]));

    const enriched = employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      status: e.status,
      role: e.role,
      totalSessions:    totalsMap[e.id]   ?? 0,
      acceptedSessions: acceptedMap[e.id] ?? 0,
      rejectedSessions: rejectedMap[e.id] ?? 0,
    }));

    return res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}
