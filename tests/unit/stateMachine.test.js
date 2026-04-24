import { describe, expect, it } from 'vitest';
import { validateCarStatusTransition } from '../../backend/src/utils/stateMachine.js';

describe('car state machine validator', () => {
  it('allows configured valid transitions', () => {
    expect(validateCarStatusTransition({
      fromStatus: 'available',
      toStatus: 'deposit_paid',
      roleName: 'employee',
      employeeCanChangeStatus: true,
    })).toEqual({ ok: true });

    expect(validateCarStatusTransition({
      fromStatus: 'deposit_paid',
      toStatus: 'sold',
      roleName: 'cfo',
    })).toEqual({ ok: true });
  });

  it('blocks invalid transitions and admin-only restores', () => {
    expect(validateCarStatusTransition({
      fromStatus: 'sold',
      toStatus: 'available',
      roleName: 'superadmin',
    }).ok).toBe(false);

    expect(validateCarStatusTransition({
      fromStatus: 'withdrawn',
      toStatus: 'available',
      roleName: 'employee',
      employeeCanChangeStatus: true,
    })).toMatchObject({ ok: false, code: 'ADMIN_ONLY_TRANSITION' });
  });

  it('honors employee status-change setting', () => {
    expect(validateCarStatusTransition({
      fromStatus: 'available',
      toStatus: 'withdrawn',
      roleName: 'employee',
      employeeCanChangeStatus: false,
    })).toMatchObject({ ok: false, code: 'EMPLOYEE_STATUS_CHANGE_DISABLED' });
  });
});
