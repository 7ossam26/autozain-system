import { expect, test } from '@playwright/test';
import { createE2EUser, resetE2EData } from './helpers/db.js';
import { loginAsSuperadmin } from './helpers/auth.js';

test.describe('Real-time car updates', () => {
  let employee;

  test.beforeEach(async () => {
    await resetE2EData();
    employee = await createE2EUser('employee', { fullName: 'E2E RealTime Employee', status: 'available' });
  });

  test('consumer cars list updates when dashboard adds and sells a car', async ({ browser }) => {
    const consumer = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', locale: 'ar-EG' });
    const dashboard = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', locale: 'ar-EG' });
    const consumerPage = await consumer.newPage();
    const dashboardPage = await dashboard.newPage();

    await consumerPage.goto('/cars');
    await expect(consumerPage.getByText('كل العربيات')).toBeVisible();
    await consumerPage.waitForLoadState('networkidle');
    await consumerPage.waitForTimeout(500);
    await loginAsSuperadmin(dashboardPage);
    await dashboardPage.goto('/dashboard/cars');

    const model = `LiveCar-${Date.now()}`;
    const add = await dashboardPage.request.post('/api/v1/cars', {
      multipart: {
        car_type: 'E2ELive',
        model,
        listing_price: '410000',
        transmission: 'automatic',
        plate_number: 'E2E-LIVE',
        odometer: '12000',
        license_info: 'رخصة اختبار',
        seller_name: 'E2E Live Seller',
        seller_phone: '01012345678',
        seller_residence: 'القاهرة',
      },
    });
    expect(add.status()).toBe(201);
    const addedCar = (await add.json()).data;
    await expect(consumerPage.getByText(`E2ELive ${model}`)).toBeVisible();

    await dashboardPage.request.patch(`/api/v1/cars/${addedCar.id}/status`, {
      data: { status: 'deposit_paid' },
    });
    await dashboardPage.request.patch(`/api/v1/cars/${addedCar.id}/status`, {
      data: { status: 'sold' },
    });
    await expect(consumerPage.getByText(`E2ELive ${model}`)).toHaveCount(0);

    await consumer.close();
    await dashboard.close();
  });
});
