import { expect, test } from '@playwright/test';
import { resetE2EData } from './helpers/db.js';
import { loginAsSuperadmin } from './helpers/auth.js';

test.describe('SuperAdmin journey', () => {
  test.beforeEach(async () => {
    await resetE2EData();
  });

  test('dashboard, users, password reset, permissions, settings, and no reset page', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/dashboard');
    await expect(page.getByText('العربيات المتاحة')).toBeVisible();
    await expect(page.getByText('إيرادات الشهر')).toBeVisible();

    await page.goto('/dashboard/users');
    await page.getByRole('button', { name: /إضافة مستخدم/ }).click();
    const username = `e2e_employee_ui_${Date.now()}`;
    const modal = page.locator('.fixed').filter({ hasText: 'إضافة مستخدم جديد' }).last();
    await modal.locator('input').nth(0).fill(username);
    await modal.locator('input').nth(1).fill('E2E موظف من الواجهة');
    await modal.locator('input').nth(2).fill('StartPass@1');
    await modal.locator('select').selectOption({ label: 'موظف' });
    await modal.getByRole('button', { name: 'إنشاء' }).click();

    const row = page.getByRole('row').filter({ hasText: username });
    await expect(row).toBeVisible();
    await row.getByLabel('تغيير كلمة المرور').click();
    const passwordModal = page.locator('.fixed').filter({ hasText: 'تغيير كلمة مرور' }).last();
    await passwordModal.locator('input').fill('ResetPass@1');
    await passwordModal.getByRole('button', { name: 'تغيير' }).click();
    await expect(passwordModal).toHaveCount(0);

    await page.goto('/dashboard/permissions');
    const permissionRow = page.getByRole('row').filter({ hasText: 'users_view' });
    const employeeSwitch = permissionRow.getByRole('switch').last();
    const before = await employeeSwitch.getAttribute('aria-checked');
    await employeeSwitch.click();
    await expect(employeeSwitch).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');

    await page.goto('/dashboard/settings');
    const settingRow = page.getByText('numeral_system').locator('xpath=ancestor::div[contains(@class,"items-start")][1]');
    await settingRow.locator('select').selectOption('arabic');
    await settingRow.getByRole('button', { name: /حفظ/ }).click();
    await expect(settingRow.locator('svg.text-primary')).toBeVisible();

    await page.goto('/dashboard/reset-password');
    await expect(page.getByText('404')).toBeVisible();
  });
});
