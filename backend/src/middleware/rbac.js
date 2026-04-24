// RBAC middleware — scaffold. Fully implemented in Phase 1.
// Usage: rbacMiddleware('cars_edit')

// eslint-disable-next-line no-unused-vars
export function rbacMiddleware(moduleKey) {
  return (req, res, next) => {
    // Phase 1: check module_access WHERE role_id = req.user.roleId AND module_key = moduleKey
    // SuperAdmin bypasses all checks.
    return next();
  };
}
