export function canAccessModule({ roleName, moduleKey, permissions = {} }) {
  if (roleName === 'superadmin') return true;
  return permissions[moduleKey] === true;
}
