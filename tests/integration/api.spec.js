import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../backend/src/app.js';
import { prisma } from '../../backend/src/config/db.js';
import { loadSettingsCache } from '../../backend/src/config/settingsCache.js';

const request = supertest(app);
const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const created = {
  users: [],
  cars: [],
  contacts: [],
  deposits: [],
  sales: [],
};

let superadminCookies = '';
let employeeCookies = '';
let cfoCookies = '';
let employee;
let cfo;
let originalTaxPercentage;

function cookiesFrom(res) {
  return (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

async function login(username, password) {
  const res = await request.post('/api/v1/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return cookiesFrom(res);
}

async function createUser(roleName, password = 'TestPass@1') {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const user = await prisma.user.create({
    data: {
      username: `${roleName}_${suffix}`,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: `Phase 7 ${roleName}`,
      roleId: role.id,
      status: roleName === 'employee' ? 'available' : 'offline',
      isActive: true,
    },
    include: { role: true },
  });
  created.users.push(user.id);
  return user;
}

async function createCar(overrides = {}) {
  const car = await prisma.car.create({
    data: {
      carType: 'Phase7Toyota',
      model: `Corolla-${suffix}`,
      listingPrice: 200000,
      licenseInfo: 'رخصة اختبار',
      transmission: 'automatic',
      plateNumber: `P7-${Math.random().toString(16).slice(2, 8)}`,
      odometer: 45000,
      images: [],
      status: 'available',
      sellerName: 'بائع اختبار',
      sellerPhone: '01012345678',
      sellerResidence: 'القاهرة',
      addedBy: employee.id,
      ...overrides,
    },
  });
  created.cars.push(car.id);
  return car;
}

beforeAll(async () => {
  await loadSettingsCache();

  employee = await createUser('employee');
  cfo = await createUser('cfo');

  originalTaxPercentage = await prisma.setting.findUnique({ where: { key: 'tax_percentage' } });
  await prisma.setting.update({ where: { key: 'tax_percentage' }, data: { value: '10' } });
  await loadSettingsCache();

  superadminCookies = await login('superadmin', '246810@Ad');
  employeeCookies = await login(employee.username, 'TestPass@1');
  cfoCookies = await login(cfo.username, 'TestPass@1');
});

afterAll(async () => {
  if (created.sales.length) await prisma.sale.deleteMany({ where: { id: { in: created.sales } } });
  if (created.deposits.length) await prisma.depositRequest.deleteMany({ where: { id: { in: created.deposits } } });
  if (created.contacts.length) await prisma.contactRequest.deleteMany({ where: { id: { in: created.contacts } } });
  if (created.cars.length) {
    await prisma.auditLog.deleteMany({ where: { entityType: 'car', entityId: { in: created.cars } } });
    await prisma.car.deleteMany({ where: { id: { in: created.cars } } });
  }
  if (created.users.length) {
    await prisma.auditLog.deleteMany({ where: { performedBy: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  }
  if (originalTaxPercentage) {
    await prisma.setting.update({
      where: { key: 'tax_percentage' },
      data: { value: originalTaxPercentage.value },
    });
    await loadSettingsCache();
  }
  await prisma.$disconnect();
});

describe('API integration coverage', () => {
  it('returns health and enforces no-auth / RBAC failures', async () => {
    const health = await request.get('/api/v1/health');
    expect(health.status).toBe(200);
    expect(health.body.success).toBe(true);

    const noAuth = await request.get('/api/v1/users');
    expect(noAuth.status).toBe(401);

    const noRbac = await request.get('/api/v1/users').set('Cookie', employeeCookies);
    expect(noRbac.status).toBe(403);
  });

  it('sets, refreshes, and clears auth cookies', async () => {
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ username: cfo.username, password: 'TestPass@1' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie'].join('|')).toContain('HttpOnly');

    const noCookie = await request.get('/api/v1/auth/me');
    expect(noCookie.status).toBe(401);

    const refresh = await request
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookiesFrom(loginRes));
    expect(refresh.status).toBe(200);
    expect(refresh.headers['set-cookie'].join('|')).toContain('access_token=');

    const logout = await request
      .post('/api/v1/auth/logout')
      .set('Cookie', cookiesFrom(loginRes));
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'].join('|')).toContain('access_token=;');
  });

  it('handles contact request validation, phone warning, accept, and completion', async () => {
    const invalid = await request.post('/api/v1/contact-requests').send({
      buyer_name: 'عميل اختبار',
      buyer_phone: '01012345678',
    });
    expect(invalid.status).toBe(400);

    const submitted = await request.post('/api/v1/contact-requests').send({
      buyer_name: 'عميل اختبار',
      buyer_phone: '1234',
      employee_id: employee.id,
    });
    expect(submitted.status).toBe(201);
    expect(submitted.body.warning).toBeTruthy();
    created.contacts.push(submitted.body.data.id);

    const accepted = await request
      .patch(`/api/v1/contact-requests/${submitted.body.data.id}`)
      .set('Cookie', employeeCookies)
      .send({ action: 'accept' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('accepted');

    const completed = await request
      .patch(`/api/v1/contact-requests/${submitted.body.data.id}/complete`)
      .set('Cookie', employeeCookies)
      .send({ outcome: 'interested' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');
  });

  it('covers deposit confirmation, sale close calculations, and report exports', async () => {
    const car = await createCar();

    const statusChanged = await request
      .patch(`/api/v1/cars/${car.id}/status`)
      .set('Cookie', employeeCookies)
      .send({ status: 'deposit_paid' });
    expect(statusChanged.status).toBe(200);

    const decimalDeposit = await request
      .post('/api/v1/deposits')
      .set('Cookie', employeeCookies)
      .send({
        car_id: car.id,
        deposit_amount: '1000.50',
        buyer_name: 'مشتري اختبار',
        buyer_phone: '01012345678',
      });
    expect(decimalDeposit.status).toBe(400);

    const deposit = await request
      .post('/api/v1/deposits')
      .set('Cookie', employeeCookies)
      .send({
        car_id: car.id,
        deposit_amount: 10000,
        buyer_name: 'مشتري اختبار',
        buyer_phone: '01012345678',
      });
    expect(deposit.status).toBe(201);
    created.deposits.push(deposit.body.data.id);

    const employeeCannotListDeposits = await request
      .get('/api/v1/deposits')
      .set('Cookie', employeeCookies);
    expect(employeeCannotListDeposits.status).toBe(403);

    const confirm = await request
      .patch(`/api/v1/deposits/${deposit.body.data.id}`)
      .set('Cookie', cfoCookies)
      .send({ action: 'confirm' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('confirmed');

    const decimalSale = await request
      .post('/api/v1/sales')
      .set('Cookie', cfoCookies)
      .send({
        car_id: car.id,
        final_sale_price: '210000.25',
        seller_received: 180000,
        buyer_name: 'مشتري اختبار',
        buyer_phone: '01012345678',
      });
    expect(decimalSale.status).toBe(400);

    const sale = await request
      .post('/api/v1/sales')
      .set('Cookie', cfoCookies)
      .send({
        car_id: car.id,
        final_sale_price: 210000,
        seller_received: 180000,
        employee_commission: 5000,
        buyer_name: 'مشتري اختبار',
        buyer_phone: '01012345678',
      });
    expect(sale.status).toBe(201);
    created.sales.push(sale.body.data.id);
    expect(sale.body.data.dealershipRevenue).toBe(30000);
    expect(sale.body.data.taxAmount).toBe(3000);

    const reports = await request.get('/api/v1/sales').set('Cookie', cfoCookies);
    expect(reports.status).toBe(200);
    expect(reports.body.data.some((row) => row.id === sale.body.data.id)).toBe(true);

    const excel = await request.get('/api/v1/sales/export/excel').set('Cookie', cfoCookies);
    expect(excel.status).toBe(200);
    expect(excel.headers['content-type']).toContain('spreadsheetml');

    const pdf = await request.get('/api/v1/sales/export/pdf').set('Cookie', cfoCookies);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });

  it('handles concurrent status changes on the same car without a server error', async () => {
    const car = await createCar({ carType: 'Phase7Concurrent' });

    const [toDeposit, toWithdrawn] = await Promise.all([
      request.patch(`/api/v1/cars/${car.id}/status`).set('Cookie', superadminCookies).send({ status: 'deposit_paid' }),
      request.patch(`/api/v1/cars/${car.id}/status`).set('Cookie', superadminCookies).send({ status: 'withdrawn' }),
    ]);

    expect([200, 422]).toContain(toDeposit.status);
    expect([200, 422]).toContain(toWithdrawn.status);
    expect([toDeposit.status, toWithdrawn.status].some((status) => status === 200)).toBe(true);

    const finalCar = await prisma.car.findUnique({ where: { id: car.id } });
    expect(['deposit_paid', 'withdrawn']).toContain(finalCar.status);
  });
});
