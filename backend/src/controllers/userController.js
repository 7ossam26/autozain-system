import bcrypt from 'bcrypt';
import {
  listUsers, findUserById, createUser, updateUser,
  updateUserPassword, deleteUser,
} from '../repositories/userRepository.js';
import { listRoles, findRoleByName } from '../repositories/roleRepository.js';
import { logAudit } from '../utils/auditLogger.js';

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
      username: username.trim(),
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
