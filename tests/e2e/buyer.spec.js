import { expect, test } from '@playwright/test';
import {
  createE2ECar,
  createE2EUser,
  resetE2EData,
} from './helpers/db.js';
import { isolateBrowserRateLimit, loginAsSuperadmin, updateSetting } from './helpers/auth.js';

function employeeCard(page, fullName) {
  return page.getByText(fullName).locator('xpath=ancestor::div[contains(@class,"bg-surface")][1]');
}

test.describe('Buyer journey', () => {
  let employeeA;
  let employeeB;
  let busyEmployee;
  let filterMatchCar;
  let expensiveCar;

  test.beforeEach(async () => {
    await resetE2EData();
    employeeA = await createE2EUser('employee', { fullName: 'E2E موظف متاح أ', status: 'available' });
    employeeB = await createE2EUser('employee', { fullName: 'E2E موظف متاح ب', status: 'available' });
    busyEmployee = await createE2EUser('employee', { fullName: 'E2E موظف مشغول', status: 'busy' });

    filterMatchCar = await createE2ECar({
      addedBy: employeeA.id,
      carType: 'E2EFilterBrand',
      model: 'MatchCar',
      listingPrice: 300000,
      plateNumber: 'E2E-FILTER-1',
    });
    expensiveCar = await createE2ECar({
      addedBy: employeeA.id,
      carType: 'E2EFilterBrand',
      model: 'TooExpensive',
      listingPrice: 900000,
      plateNumber: 'E2E-FILTER-2',
    });
  });

  test('home, cars, details, favorites, employees, and contact request flow', async ({ page }) => {
    await isolateBrowserRateLimit(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('أوتوزين').first()).toBeVisible();

    await page.goto('/cars');
    await expect(page.getByText('E2EFilterBrand MatchCar')).toBeVisible();

    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await page.getByRole('button', { name: /الفلاتر/ }).click();
    }
    await page.getByRole('checkbox', { name: 'E2EFilterBrand' }).check();
    const priceSection = page.getByText(/^السعر/).last().locator('xpath=ancestor::div[1]');
    await priceSection.locator('input[placeholder="من"]').fill('250000');
    await priceSection.locator('input[placeholder="إلى"]').fill('350000');
    await expect(page.getByText('E2EFilterBrand MatchCar')).toBeVisible();
    await expect(page.getByText('E2EFilterBrand TooExpensive')).toHaveCount(0);
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await page.locator('.fixed.inset-0.z-50 button').last().click();
      await expect(page.locator('.fixed.inset-0.z-50')).toHaveCount(0);
    }

    await page.getByText('E2EFilterBrand MatchCar').click();
    await expect(page).toHaveURL(new RegExp(`/cars/${filterMatchCar.id}`));
    await expect(page.getByText('المواصفات')).toBeVisible();
    await expect(page.getByText('ج.م').first()).toBeVisible();
    await expect(page.getByText('E2E Seller Hidden')).toHaveCount(0);
    await expect(page.getByText('01000000000')).toHaveCount(0);

    await page.getByRole('button', { name: 'إضافة للمفضلة' }).first().click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'إزالة من المفضلة' }).first()).toBeVisible();
    await page.goto('/favorites');
    await expect(page.getByText('E2EFilterBrand MatchCar')).toBeVisible();
    await page.getByRole('button', { name: 'إزالة من المفضلة' }).first().click();
    await expect(page.getByText('مفيش عربيات في المفضلة')).toBeVisible();

    await page.goto('/employees');
    await expect(page.getByText(employeeA.fullName)).toBeVisible();
    await expect(page.getByText(busyEmployee.fullName)).toBeVisible();
    await expect(employeeCard(page, busyEmployee.fullName).getByText('مشغول', { exact: true })).toBeVisible();

    await page.waitForTimeout(500);
    const busyLogin = await page.request.post('/api/v1/auth/login', {
      data: { username: busyEmployee.username, password: 'TestPass@1' },
    });
    expect(busyLogin.status()).toBe(200);
    const busyStatusUpdate = await page.request.patch('/api/v1/users/me/status', { data: { status: 'available' } });
    expect(busyStatusUpdate.status()).toBe(200);
    await expect(employeeCard(page, busyEmployee.fullName).getByText('متاح')).toBeVisible();

    await loginAsSuperadmin(page);
    await updateSetting(page, 'request_timeout_minutes', 0.05);
    await page.goto('/employees');
    await employeeCard(page, employeeA.fullName).getByRole('button', { name: 'تواصل' }).click();
    const contactModal = page.locator('.fixed').filter({ hasText: `تواصل مع ${employeeA.fullName}` }).last();
    await contactModal.locator('input').nth(0).fill('E2E مشتري');
    await contactModal.locator('input').nth(1).fill('01012345678');
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
    await expect(page.getByText('تم إرسال طلبك')).toBeVisible();
    await expect(page.getByText(/00:/)).toBeVisible();
    await expect(page.getByText('تم إرسال طلبك')).toHaveCount(0, { timeout: 5000 });

    await employeeCard(page, employeeB.fullName).getByRole('button', { name: 'تواصل' }).click();
    await expect(page.getByText(`تواصل مع ${employeeB.fullName}`)).toBeVisible();
  });
});
