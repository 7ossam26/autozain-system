import { ROLE_NAMES } from '../config/constants.js';
import { checkModuleAccess } from '../repositories/moduleAccessRepository.js';
import { canAccessModule } from '../utils/rbac.js';

export function rbacMiddleware(moduleKey) {
  return async (req, res, next) => {
    const allowed = await checkModuleAccess(req.user.roleId, moduleKey);
    if (!canAccessModule({
      roleName: req.user?.roleName ?? ROLE_NAMES.EMPLOYEE,
      moduleKey,
      permissions: { [moduleKey]: allowed },
    })) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا',
        error_code: 'FORBIDDEN',
      });
    }
    next();
  };
}
