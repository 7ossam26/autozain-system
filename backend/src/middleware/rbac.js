import { ROLE_NAMES } from '../config/constants.js';
import { checkModuleAccess } from '../repositories/moduleAccessRepository.js';

export function rbacMiddleware(moduleKey) {
  return async (req, res, next) => {
    if (req.user?.roleName === ROLE_NAMES.SUPERADMIN) return next();

    const allowed = await checkModuleAccess(req.user.roleId, moduleKey);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا',
        error_code: 'FORBIDDEN',
      });
    }
    next();
  };
}
