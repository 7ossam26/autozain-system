import { getAllModuleAccess, setModuleAccess } from '../repositories/moduleAccessRepository.js';
import { listRoles } from '../repositories/roleRepository.js';
import { MODULE_KEYS, ROLE_NAMES } from '../config/constants.js';
import { logAudit } from '../utils/auditLogger.js';

export async function getPermissionsMatrix(req, res, next) {
  try {
    const [allAccess, roles] = await Promise.all([getAllModuleAccess(), listRoles()]);

    // Build map: roleId -> moduleKey -> isEnabled
    const matrix = {};
    for (const row of allAccess) {
      if (!matrix[row.roleId]) matrix[row.roleId] = {};
      matrix[row.roleId][row.moduleKey] = row.isEnabled;
    }

    const nonSuperadminRoles = roles.filter((r) => r.name !== ROLE_NAMES.SUPERADMIN);

    return res.json({
      success: true,
      data: {
        roles: nonSuperadminRoles,
        moduleKeys: MODULE_KEYS,
        matrix,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePermission(req, res, next) {
  try {
    const { roleId, moduleKey } = req.params;
    const { isEnabled } = req.body ?? {};

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'قيمة isEnabled لازم تكون true أو false',
        error_code: 'VALIDATION_ERROR',
      });
    }

    if (!MODULE_KEYS.includes(moduleKey)) {
      return res.status(400).json({
        success: false,
        message: 'المفتاح غير معروف',
        error_code: 'INVALID_MODULE_KEY',
      });
    }

    const row = await setModuleAccess(roleId, moduleKey, isEnabled, req.user.userId);

    await logAudit({
      entityType: 'setting',
      entityId: roleId,
      action: 'permissions_update',
      newValue: { moduleKey, isEnabled },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
}
