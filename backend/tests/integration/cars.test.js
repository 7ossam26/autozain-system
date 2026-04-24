import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import supertest from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { loadSettingsCache } from '../../src/config/settingsCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const request = supertest(app);

function extractCookies(res) {
  return (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

// Tiny 1×1 valid JPEG in memory (avoids needing a fixture file)
const TINY_JPEG_PATH = path.join(__dirname, 'fixture.jpg');

let adminCookies = '';
let createdCarId = '';

beforeAll(async () => {
  // Ensure settings cache is loaded (normally done on server start)
  await loadSettingsCache();

  // Create a valid JPEG fixture for upload tests
  if (!fs.existsSync(TINY_JPEG_PATH)) {
    // Minimal valid JPEG bytes
    const jpegBytes = Buffer.from(
      'FFD8FFE000104A46494600010100000100010000'
      + 'FFD9', 'hex',
    );
    fs.writeFileSync(TINY_JPEG_PATH, jpegBytes);
  }

  const res = await request
    .post('/api/v1/auth/login')
    .send({ username: 'superadmin', password: '246810@Ad' });
  adminCookies = extractCookies(res);
});

afterAll(async () => {
  if (fs.existsSync(TINY_JPEG_PATH)) fs.unlinkSync(TINY_JPEG_PATH);
  await prisma.$disconnect();
});

// Clean up cars created by tests
afterEach(async () => {
  if (createdCarId) {
    await prisma.car.deleteMany({ where: { id: createdCarId } });
    createdCarId = '';
  }
});

// ─── GET /cars ────────────────────────────────────────────────────────────────
describe('Cars — GET /api/v1/cars', () => {
  it('returns paginated car list with meta', async () => {
    const res = await request.get('/api/v1/cars').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('limit');
  });

  it('returns 401 without auth', async () => {
    const res = await request.get('/api/v1/cars');
    expect(res.status).toBe(401);
  });

  it('filters by status', async () => {
    const res = await request
      .get('/api/v1/cars?status=available')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    for (const car of res.body.data) {
      expect(car.status).toBe('available');
    }
  });

  it('respects page + limit params', async () => {
    const res = await request
      .get('/api/v1/cars?page=1&limit=5')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });
});

// ─── POST /cars ───────────────────────────────────────────────────────────────
describe('Cars — POST /api/v1/cars (create)', () => {
  it('creates a car with required fields', async () => {
    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Toyota')
      .field('model', 'Corolla')
      .field('listing_price', '150000')
      .field('transmission', 'automatic')
      .field('plate_number', 'أ ب ١٢٣٤')
      .field('odometer', '50000')
      .field('license_info', 'رخصة 2025')
      .field('seller_name', 'محمد علي')
      .field('seller_phone', '01012345678')
      .field('seller_residence', 'القاهرة');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.carType).toBe('Toyota');
    expect(res.body.data.model).toBe('Corolla');
    expect(res.body.data.listingPrice).toBe(150000);
    expect(res.body.data.status).toBe('available');
    createdCarId = res.body.data.id;
  });

  it('returns phone warning for invalid phone', async () => {
    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Honda')
      .field('model', 'Civic')
      .field('listing_price', '120000')
      .field('transmission', 'manual')
      .field('plate_number', 'B 5678')
      .field('odometer', '30000')
      .field('license_info', 'رخصة')
      .field('seller_name', 'أحمد')
      .field('seller_phone', '1234')
      .field('seller_residence', 'الجيزة');

    expect(res.status).toBe(201);
    expect(res.body.warning).toBeTruthy();
    createdCarId = res.body.data.id;
  });

  it('rejects decimal listing_price', async () => {
    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'BMW')
      .field('model', '3 Series')
      .field('listing_price', '150000.50')
      .field('transmission', 'automatic')
      .field('plate_number', 'XYZ')
      .field('odometer', '10000')
      .field('license_info', 'رخصة')
      .field('seller_name', 'سامي')
      .field('seller_phone', '01098765432');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Toyota');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('rejects file over 5 MB', async () => {
    // Create a temp >5MB file
    const bigFile = path.join(__dirname, 'bigfile.jpg');
    fs.writeFileSync(bigFile, Buffer.alloc(6 * 1024 * 1024, 0xff));

    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Kia')
      .field('model', 'Sportage')
      .field('listing_price', '200000')
      .field('transmission', 'automatic')
      .field('plate_number', 'K 001')
      .field('odometer', '20000')
      .field('license_info', 'رخصة')
      .field('seller_name', 'عمر')
      .field('seller_phone', '01111111111')
      .attach('images', bigFile);

    fs.unlinkSync(bigFile);
    expect(res.status).toBe(400);
  });

  it('rejects non-image file', async () => {
    const txtFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(txtFile, 'not an image');

    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Kia')
      .field('model', 'Rio')
      .field('listing_price', '100000')
      .field('transmission', 'manual')
      .field('plate_number', 'R 002')
      .field('odometer', '15000')
      .field('license_info', 'رخصة')
      .field('seller_name', 'سمير')
      .field('seller_phone', '01099999999')
      .attach('images', txtFile);

    fs.unlinkSync(txtFile);
    expect([400, 422, 500]).toContain(res.status);
  });
});

// ─── GET /cars/:id ────────────────────────────────────────────────────────────
describe('Cars — GET /api/v1/cars/:id', () => {
  let carId;

  beforeAll(async () => {
    const car = await prisma.car.create({
      data: {
        carType: 'Nissan', model: 'Sunny', listingPrice: 90000,
        licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'N 100',
        odometer: 40000, images: [], status: 'available',
        sellerName: 'حسن', sellerPhone: '01055555555', sellerResidence: 'الإسكندرية',
        addedBy: await getSuperAdminId(),
      },
    });
    carId = car.id;
  });

  afterAll(async () => {
    if (carId) await prisma.car.deleteMany({ where: { id: carId } });
  });

  it('returns full car detail + audit log', async () => {
    const res = await request.get(`/api/v1/cars/${carId}`).set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(carId);
    expect(res.body.data).toHaveProperty('auditLog');
    expect(Array.isArray(res.body.data.auditLog)).toBe(true);
  });

  it('includes seller info for superadmin', async () => {
    const res = await request.get(`/api/v1/cars/${carId}`).set('Cookie', adminCookies);
    expect(res.body.data.sellerName).toBeTruthy();
    expect(res.body.data.sellerPhone).toBeTruthy();
  });

  it('returns 404 for non-existent car', async () => {
    const res = await request
      .get('/api/v1/cars/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /cars/:id ────────────────────────────────────────────────────────────
describe('Cars — PUT /api/v1/cars/:id (update)', () => {
  let carId;

  beforeAll(async () => {
    const car = await prisma.car.create({
      data: {
        carType: 'Peugeot', model: '207', listingPrice: 80000,
        licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'P 200',
        odometer: 70000, images: [], status: 'available',
        sellerName: 'ناصر', sellerPhone: '01033333333', sellerResidence: 'أسيوط',
        addedBy: await getSuperAdminId(),
      },
    });
    carId = car.id;
  });

  afterAll(async () => {
    if (carId) await prisma.car.deleteMany({ where: { id: carId } });
  });

  it('updates car fields', async () => {
    const res = await request
      .put(`/api/v1/cars/${carId}`)
      .set('Cookie', adminCookies)
      .field('listing_price', '85000')
      .field('color', 'أبيض');

    expect(res.status).toBe(200);
    expect(res.body.data.listingPrice).toBe(85000);
    expect(res.body.data.color).toBe('أبيض');
  });

  it('rejects decimal price on update', async () => {
    const res = await request
      .put(`/api/v1/cars/${carId}`)
      .set('Cookie', adminCookies)
      .field('listing_price', '85000.99');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for non-existent car', async () => {
    const res = await request
      .put('/api/v1/cars/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies)
      .field('color', 'أحمر');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /cars/:id/status ────────────────────────────────────────────────────
describe('Cars — PATCH /api/v1/cars/:id/status (state machine)', () => {
  let carId;

  beforeAll(async () => {
    const car = await prisma.car.create({
      data: {
        carType: 'Chevrolet', model: 'Optra', listingPrice: 110000,
        licenseInfo: 'رخصة', transmission: 'automatic', plateNumber: 'C 300',
        odometer: 60000, images: [], status: 'available',
        sellerName: 'فريد', sellerPhone: '01022222222', sellerResidence: 'الأقصر',
        addedBy: await getSuperAdminId(),
      },
    });
    carId = car.id;
  });

  afterAll(async () => {
    if (carId) await prisma.car.deleteMany({ where: { id: carId } });
  });

  it('valid: available → deposit_paid', async () => {
    const res = await request
      .patch(`/api/v1/cars/${carId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'deposit_paid' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('deposit_paid');
  });

  it('valid: deposit_paid → sold', async () => {
    const res = await request
      .patch(`/api/v1/cars/${carId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'sold' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sold');
  });

  it('invalid: sold → available (final state)', async () => {
    const res = await request
      .patch(`/api/v1/cars/${carId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'available' });

    expect(res.status).toBe(422);
    expect(res.body.error_code).toBe('INVALID_TRANSITION');
  });

  it('invalid: skipping deposit_paid → go available → withdrawn → available requires admin', async () => {
    // Create a fresh car, change to withdrawn, try to restore
    const freshCar = await prisma.car.create({
      data: {
        carType: 'Ford', model: 'Focus', listingPrice: 95000,
        licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'F 400',
        odometer: 25000, images: [], status: 'withdrawn',
        sellerName: 'كريم', sellerPhone: '01044444444', sellerResidence: 'طنطا',
        addedBy: await getSuperAdminId(),
      },
    });

    // Superadmin can do withdrawn → available
    const res = await request
      .patch(`/api/v1/cars/${freshCar.id}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'available' });

    expect(res.status).toBe(200);
    await prisma.car.deleteMany({ where: { id: freshCar.id } });
  });

  it('creates audit log on status change', async () => {
    const freshCar = await prisma.car.create({
      data: {
        carType: 'Skoda', model: 'Octavia', listingPrice: 180000,
        licenseInfo: 'رخصة', transmission: 'automatic', plateNumber: 'S 500',
        odometer: 30000, images: [], status: 'available',
        sellerName: 'وليد', sellerPhone: '01066666666', sellerResidence: 'مدينة نصر',
        addedBy: await getSuperAdminId(),
      },
    });

    await request
      .patch(`/api/v1/cars/${freshCar.id}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'withdrawn' });

    const auditEntries = await prisma.auditLog.findMany({
      where: { entityType: 'car', entityId: freshCar.id, action: 'status_change' },
    });

    expect(auditEntries.length).toBeGreaterThanOrEqual(1);
    expect(auditEntries[0].oldValue).toMatchObject({ status: 'available' });
    expect(auditEntries[0].newValue).toMatchObject({ status: 'withdrawn' });

    await prisma.auditLog.deleteMany({ where: { entityId: freshCar.id } });
    await prisma.car.deleteMany({ where: { id: freshCar.id } });
  });

  it('returns 404 for non-existent car', async () => {
    const res = await request
      .patch('/api/v1/cars/00000000-0000-0000-0000-000000000000/status')
      .set('Cookie', adminCookies)
      .send({ status: 'available' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /cars/:id ─────────────────────────────────────────────────────────
describe('Cars — DELETE /api/v1/cars/:id', () => {
  it('deletes an available car', async () => {
    const car = await prisma.car.create({
      data: {
        carType: 'Hyundai', model: 'Accent', listingPrice: 75000,
        licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'H 600',
        odometer: 55000, images: [], status: 'available',
        sellerName: 'مصطفى', sellerPhone: '01077777777', sellerResidence: 'الزقازيق',
        addedBy: await getSuperAdminId(),
      },
    });

    const res = await request
      .delete(`/api/v1/cars/${car.id}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();

    const exists = await prisma.car.findUnique({ where: { id: car.id } });
    expect(exists).toBeNull();
  });

  it('blocks delete when status is deposit_paid', async () => {
    const car = await prisma.car.create({
      data: {
        carType: 'Renault', model: 'Logan', listingPrice: 65000,
        licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'R 700',
        odometer: 80000, images: [], status: 'deposit_paid',
        sellerName: 'إيهاب', sellerPhone: '01088888888', sellerResidence: 'بورسعيد',
        addedBy: await getSuperAdminId(),
      },
    });

    const res = await request
      .delete(`/api/v1/cars/${car.id}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(422);
    expect(res.body.error_code).toBe('CANNOT_DELETE_DEPOSIT');

    // Cleanup
    await prisma.car.deleteMany({ where: { id: car.id } });
  });

  it('returns 404 for non-existent car', async () => {
    const res = await request
      .delete('/api/v1/cars/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(404);
  });
});

// ─── Audit log on car create ──────────────────────────────────────────────────
describe('Cars — Audit log on creation', () => {
  it('creates an audit entry when car is added', async () => {
    const res = await request
      .post('/api/v1/cars')
      .set('Cookie', adminCookies)
      .field('car_type', 'Suzuki')
      .field('model', 'Alto')
      .field('listing_price', '45000')
      .field('transmission', 'manual')
      .field('plate_number', 'SU 800')
      .field('odometer', '10000')
      .field('license_info', 'رخصة')
      .field('seller_name', 'عادل')
      .field('seller_phone', '01091111111')
      .field('seller_residence', 'المنيا');

    expect(res.status).toBe(201);
    const carId = res.body.data.id;

    const audit = await prisma.auditLog.findMany({
      where: { entityType: 'car', entityId: carId, action: 'create' },
    });
    expect(audit.length).toBeGreaterThanOrEqual(1);

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { entityId: carId } });
    await prisma.car.deleteMany({ where: { id: carId } });
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getSuperAdminId() {
  const u = await prisma.user.findUnique({ where: { username: 'superadmin' } });
  return u.id;
}
