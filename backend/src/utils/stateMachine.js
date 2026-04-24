const VALID_TRANSITIONS = {
  available: ['deposit_paid', 'withdrawn'],
  deposit_paid: ['available', 'sold'],
  sold: [],
  withdrawn: ['available'],
};

const ADMIN_ROLES = new Set(['superadmin', 'admin']);
const ADMIN_ONLY_TRANSITIONS = new Set(['withdrawn->available']);
const EMPLOYEE_TRANSITIONS_NEED_SETTING = new Set([
  'available->deposit_paid',
  'available->withdrawn',
  'deposit_paid->available',
  'deposit_paid->sold',
]);

const MESSAGES = {
  INVALID_TRANSITION: ({ fromStatus, toStatus }) =>
    `لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}"`,
  ADMIN_ONLY_TRANSITION: () => 'هذا التغيير يتطلب صلاحيات مدير',
  EMPLOYEE_STATUS_CHANGE_DISABLED: () =>
    'تغيير حالة العربية غير مفعّل للموظفين حالياً',
};

export function validateCarStatusTransition({
  fromStatus,
  toStatus,
  roleName,
  employeeCanChangeStatus = true,
}) {
  const allowed = VALID_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: MESSAGES.INVALID_TRANSITION({ fromStatus, toStatus }),
    };
  }

  const transitionKey = `${fromStatus}->${toStatus}`;
  if (ADMIN_ONLY_TRANSITIONS.has(transitionKey) && !ADMIN_ROLES.has(roleName)) {
    return {
      ok: false,
      code: 'ADMIN_ONLY_TRANSITION',
      message: MESSAGES.ADMIN_ONLY_TRANSITION(),
    };
  }

  if (
    roleName === 'employee'
    && EMPLOYEE_TRANSITIONS_NEED_SETTING.has(transitionKey)
    && !employeeCanChangeStatus
  ) {
    return {
      ok: false,
      code: 'EMPLOYEE_STATUS_CHANGE_DISABLED',
      message: MESSAGES.EMPLOYEE_STATUS_CHANGE_DISABLED(),
    };
  }

  return { ok: true };
}
