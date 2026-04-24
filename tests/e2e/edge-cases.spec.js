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

test.describe('Phase 7 edge cases', () => {
  test.beforeEach(async () => {
    await resetE2EData();
  });

  test('login rate limit blocks after five failures', async ({ page }) => {
    const username = `missing_${Date.now()}`;
    const ip = '10.77.0.10';
    for (let i = 0; i < 5; i += 1) {
      const res = await page.request.post('/api/v1/auth/login', {
        data: { username, password: 'wrong' },
        headers: { 'X-Forwarded-For': ip },
      });
      expect(res.status()).toBe(401);
    }

    const blocked = await page.request.post('/api/v1/auth/login', {
      data: { username, password: 'wrong' },
      headers: { 'X-Forwarded-For': ip },
    });
    expect(blocked.status()).toBe(429);
  });

  test('cookies omitted from an API request produce 401', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/dashboard');
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/me', { credentials: 'omit' });
      return res.status;
    });
    expect(status).toBe(401);
  });

  test('decimal price is rejected by API validation', async ({ page }) => {
    await loginAsSuperadmin(page);
    const response = await page.request.post('/api/v1/cars', {
      multipart: {
        car_type: 'E2EDecimal',
        model: 'Rejected',
        listing_price: '150000.50',
        transmission: 'automatic',
        plate_number: 'E2E-DEC',
        odometer: '10000',
        license_info: 'رخصة',
        seller_name: 'E2E Seller',
        seller_phone: '01012345678',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('phone soft warning shows but contact request still submits', async ({ page }) => {
    await isolateBrowserRateLimit(page);
    const employee = await createE2EUser('employee', { fullName: 'E2E Soft Warning Employee', status: 'available' });
    await page.goto('/employees');
    await employeeCard(page, employee.fullName).getByRole('button', { name: 'تواصل' }).click();
    const contactModal = page.locator('.fixed').filter({ hasText: `تواصل مع ${employee.fullName}` }).last();
    await contactModal.locator('input').nth(0).fill('E2E Buyer Warning');
    await contactModal.locator('input').nth(1).fill('1234');
    await expect(page.getByText('الرقم ممكن يكون غلط')).toBeVisible();
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
    await expect(page.getByText('تم إرسال طلبك')).toBeVisible();
  });

  test('numeral system switch changes displayed car prices', async ({ page }) => {
    const employee = await createE2EUser('employee', { status: 'available' });
    await createE2ECar({
      addedBy: employee.id,
      carType: 'E2ENumeral',
      model: 'ArabicDigits',
      listingPrice: 123456,
    });

    await loginAsSuperadmin(page);
    await updateSetting(page, 'numeral_system', 'arabic');
    await page.goto('/cars?search=E2ENumeral');
    await expect(page.getByText(/[١٢٣٤٥٦]/).first()).toBeVisible();
  });

  test('concurrent status changes on the same car do not produce a server error', async ({ page }) => {
    await loginAsSuperadmin(page);
    const employee = await createE2EUser('employee', { status: 'available' });
    const car = await createE2ECar({ addedBy: employee.id, carType: 'E2EConcurrent', model: 'Race' });

    const [deposit, withdrawn] = await Promise.all([
      page.request.patch(`/api/v1/cars/${car.id}/status`, { data: { status: 'deposit_paid' } }),
      page.request.patch(`/api/v1/cars/${car.id}/status`, { data: { status: 'withdrawn' } }),
    ]);

    expect([200, 422]).toContain(deposit.status());
    expect([200, 422]).toContain(withdrawn.status());
    expect([deposit.status(), withdrawn.status()].some((status) => status === 200)).toBe(true);
  });
});
