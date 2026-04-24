import { expect, test } from '@playwright/test';
import {
  createDepositFixture,
  createE2EUser,
  resetE2EData,
} from './helpers/db.js';
import { loginViaApi } from './helpers/auth.js';

test.describe('CFO journey', () => {
  let cfo;
  let employee;
  let car;

  test.beforeEach(async () => {
    await resetE2EData();
    employee = await createE2EUser('employee', { fullName: 'E2E موظف مالي', status: 'available' });
    cfo = await createE2EUser('cfo', { fullName: 'E2E مدير حسابات' });
    ({ car } = await createDepositFixture({ employeeId: employee.id, cfoId: cfo.id }));
  });

  test('confirm deposit, close sale, verify reports, and download exports', async ({ page }) => {
    await loginViaApi(page, cfo.username, 'TestPass@1');
    await page.goto('/dashboard/financial/deposits');
    await expect(page.getByRole('heading', { name: 'طلبات العربون' })).toBeVisible();
    await expect(page.getByText(car.model)).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد' }).first().click();
    await page.getByRole('button', { name: 'تأكيد العربون' }).click();
    await expect(page.getByText('مؤكد').first()).toBeVisible();

    await page.goto('/dashboard/financial/pending');
    await expect(page.getByText(car.model)).toBeVisible();
    await page.getByRole('button', { name: /قفل البيعة/ }).first().click();
    const modal = page.locator('.fixed').filter({ hasText: 'قفل البيعة' }).last();
    await modal.locator('input').nth(0).fill('390000');
    await modal.locator('input').nth(1).fill('350000');
    await modal.locator('input').nth(2).fill('5000');
    await expect(modal.getByText('40,000 ج.م')).toBeVisible();
    await modal.getByRole('button', { name: 'قفل البيعة' }).click();
    await expect(page.getByText('مفيش بيعات معلقة')).toBeVisible();

    await page.goto('/dashboard/reports');
    await expect(page.getByText(car.model)).toBeVisible();
    await expect(page.getByText('390,000 ج.م').first()).toBeVisible();
    await expect(page.getByText('40,000 ج.م').first()).toBeVisible();

    const [excelDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Excel/ }).click(),
    ]);
    expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/);

    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /PDF/ }).click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
