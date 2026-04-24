export const API_PREFIX = '/api/v1';

export const COOKIE_NAMES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
};

export const ROLE_NAMES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CFO: 'cfo',
  TEAM_MANAGER: 'team_manager',
  EMPLOYEE: 'employee',
};

export const MODULE_KEYS = [
  'cars_view',
  'cars_add',
  'cars_edit',
  'cars_delete',
  'cars_change_status',
  'financial_view',
  'financial_close_sale',
  'reports_view',
  'reports_export',
  'settings_view',
  'settings_edit',
  'users_view',
  'users_create',
  'users_edit',
  'users_delete',
  'archive_view',
  'employee_monitor',
  'permissions_manage',
];

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
