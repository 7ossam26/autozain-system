import { describe, expect, it } from 'vitest';
import { canAccessModule } from '../../backend/src/utils/rbac.js';

describe('RBAC permission checker', () => {
  it('lets superadmin access every module', () => {
    expect(canAccessModule({
      roleName: 'superadmin',
      moduleKey: 'reports_export',
      permissions: {},
    })).toBe(true);
  });

  it('uses explicit module access for non-superadmin roles', () => {
    expect(canAccessModule({
      roleName: 'employee',
      moduleKey: 'cars_view',
      permissions: { cars_view: true },
    })).toBe(true);

    expect(canAccessModule({
      roleName: 'employee',
      moduleKey: 'users_view',
      permissions: { cars_view: true },
    })).toBe(false);
  });
});
