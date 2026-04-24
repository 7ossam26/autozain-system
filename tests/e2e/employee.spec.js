import { expect, test } from '@playwright/test';
import {
  createE2ECar,
  createE2EUser,
  resetE2EData,
} from './helpers/db.js';
import { loginViaApi, uniqueForwardedFor } from './helpers/auth.js';

test.describe('Employee journey', () => {
  let employee;
  let car;

  test.beforeEach(async () => {
    await resetE2EData();
    employee = await createE2EUser('employee', { fullName: 'E2E موظف رحلة', status: 'offline' });
    car = await createE2ECar({
      addedBy: employee.id,
      carType: 'E2EEmployee',
      model: 'SessionCar',
      listingPrice: 280000,
    });
  });

  test('login, availability, incoming request, accept, status change suggestion, and end session', async ({ page }) => {
    await loginViaApi(page, employee.username, 'TestPass@1');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: new RegExp(employee.fullName) })).toBeVisible();

    await page.getByRole('button', { name: /مش متاح/ }).click();
    await expect(page.getByRole('button', { name: /أنا متاح/ })).toBeVisible();

    const submitted = await page.request.post('/api/v1/contact-requests', {
      headers: { 'X-Forwarded-For': uniqueForwardedFor() },
      data: {
        buyer_name: 'E2E مشتري جلسة',
        buyer_phone: '01012345678',
        employee_id: employee.id,
      },
    });
    expect(submitted.status()).toBe(201);

    await expect(page.getByText('طلب تواصل جديد')).toBeVisible();
    await expect(page.getByText('E2E مشتري جلسة')).toBeVisible();
    await page.getByRole('button', { name: 'قبول' }).click();

    await expect(page.getByText('جلسة شغالة')).toBeVisible();
    await expect(page.getByRole('button', { name: /مشغول/ })).toBeVisible();

    await page.goto(`/dashboard/cars/${car.id}`);
    await page.getByRole('button', { name: 'عربون' }).click();
    await expect(page.getByText(/حالة العربية/)).toBeVisible();

    await page.getByRole('button', { name: /إنهاء الجلسة/ }).click();
    await expect(page.getByText('جلسة شغالة')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /أنا متاح/ })).toBeVisible();
  });
});
