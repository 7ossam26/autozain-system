import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { loadSettingsCache } from '../../src/config/settingsCache.js';

const request = supertest(app);

let superAdminId;
const createdCarIds = [];

async function createCar(overrides = {}) {
  const car = await prisma.car.create({
    data: {
      carType: 'Mitsubishi', model: 'Lancer', listingPrice: 200000,
      licenseInfo: 'رخصة', transmission: 'manual', plateNumber: 'L 1',
      odometer: 50000, images: ['/uploads/cars/x.jpg'], status: 'available',
      sellerName: 'SECRET NAME', sellerPhone: '01000000000',
      sellerResidence: 'SECRET RES',
      sellerLicenseFront: '/uploads/licenses/front.jpg',
      sellerLicenseBack: '/uploads/licenses/back.jpg',
      addedBy: superAdminId,
      ...overrides,
    },
  });
  createdCarIds.push(car.id);
  return car;
}

beforeAll(async () => {
  await loadSettingsCache();
  const admin = await prisma.user.findUnique({ where: { username: 'superadmin' } });
  superAdminId = admin.id;
});

afterAll(async () => {
  if (createdCarIds.length) {
    await prisma.car.deleteMany({ where: { id: { in: createdCarIds } } });
  }
  await prisma.$disconnect();
});

// ─── GET /api/v1/public/cars ─────────────────────────────────────────────────
describe('Public — GET /api/v1/public/cars', () => {
  it('requires no auth', async () => {
    const res = await request.get('/api/v1/public/cars');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('excludes seller fields from the list payload', async () => {
    await createCar({ carType: 'Toyota', model: 'Corolla-Pub' });
    const res = await request.get('/api/v1/public/cars');
    for (const car of res.body.data) {
      expect(car).not.toHaveProperty('sellerName');
      expect(car).not.toHaveProperty('sellerPhone');
      expect(car).not.toHaveProperty('sellerResidence');
      expect(car).not.toHaveProperty('sellerLicenseFront');
      expect(car).not.toHaveProperty('sellerLicenseBack');
    }
  });

  it('returns only cars with status=available', async () => {
    await createCar({ carType: 'Nissan', model: 'Sunny-Pub', status: 'sold' });
    await createCar({ carType: 'Nissan', model: 'Sunny-Pub-2', status: 'withdrawn' });
    const res = await request.get('/api/v1/public/cars?limit=50');
    for (const car of res.body.data) {
      expect(car.status).toBeUndefined(); // status not in public projection
    }
    // Verify sold/withdrawn cars aren't returned
    const bySearch = await request.get('/api/v1/public/cars?search=Sunny-Pub');
    expect(bySearch.status).toBe(200);
    // None of the Sunny-Pub entries are available, so must be empty
    expect(bySearch.body.data.length).toBe(0);
  });

  it('returns filter options when include_filters=1', async () => {
    await createCar({ carType: 'Honda', model: 'Civic-Pub', listingPrice: 150000 });
    const res = await request.get('/api/v1/public/cars?include_filters=1');
    expect(res.body.filters).toBeDefined();
    expect(Array.isArray(res.body.filters.brands)).toBe(true);
    expect(res.body.filters).toHaveProperty('modelsByBrand');
    expect(res.body.filters).toHaveProperty('priceRange');
    expect(res.body.filters).toHaveProperty('odometerRange');
  });

  it('applies price filters', async () => {
    const cheap = await createCar({ carType: 'Kia', model: 'Rio-Cheap', listingPrice: 60000 });
    const expensive = await createCar({ carType: 'Kia', model: 'Rio-Pricey', listingPrice: 900000 });

    const res = await request.get('/api/v1/public/cars?price_min=100000&price_max=500000&limit=50');
    const ids = res.body.data.map((c) => c.id);
    expect(ids).not.toContain(cheap.id);
    expect(ids).not.toContain(expensive.id);
  });

  it('filters by transmission', async () => {
    await createCar({ carType: 'BMW', model: 'M3-Auto', transmission: 'automatic' });
    await createCar({ carType: 'BMW', model: 'M3-Man',  transmission: 'manual' });
    const res = await request.get('/api/v1/public/cars?transmission=automatic&limit=50');
    for (const car of res.body.data) {
      expect(car.transmission).toBe('automatic');
    }
  });

  it('ignores invalid transmission value', async () => {
    const res = await request.get('/api/v1/public/cars?transmission=bogus');
    expect(res.status).toBe(200);
  });

  it('supports comma-separated multi brand filter', async () => {
    await createCar({ carType: 'Hyundai', model: 'Multi-1' });
    await createCar({ carType: 'Suzuki',  model: 'Multi-2' });
    const res = await request.get('/api/v1/public/cars?car_type=Hyundai,Suzuki&limit=100');
    const brands = new Set(res.body.data.map((c) => c.carType));
    for (const b of brands) {
      expect(['Hyundai', 'Suzuki']).toContain(b);
    }
  });

  it('sorts by price_asc', async () => {
    const res = await request.get('/api/v1/public/cars?sort=price_asc&limit=50');
    const prices = res.body.data.map((c) => c.listingPrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('searches Arabic text in additional_info', async () => {
    const car = await createCar({
      carType: 'Peugeot', model: 'PubSearch',
      additionalInfo: 'عربية نضيفة جداً ومفحوصة',
    });
    const res = await request.get('/api/v1/public/cars?search=نضيفة');
    const ids = res.body.data.map((c) => c.id);
    expect(ids).toContain(car.id);
  });

  it('respects pagination meta', async () => {
    const res = await request.get('/api/v1/public/cars?page=1&limit=5');
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(5);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('caps limit at 50', async () => {
    const res = await request.get('/api/v1/public/cars?limit=999');
    expect(res.body.data.length).toBeLessThanOrEqual(50);
  });
});

// ─── GET /api/v1/public/cars/:id ─────────────────────────────────────────────
describe('Public — GET /api/v1/public/cars/:id', () => {
  it('returns car detail without seller fields', async () => {
    const car = await createCar({ carType: 'Ford', model: 'Focus-Det' });
    const res = await request.get(`/api/v1/public/cars/${car.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(car.id);
    expect(res.body.data).not.toHaveProperty('sellerName');
    expect(res.body.data).not.toHaveProperty('sellerPhone');
    expect(res.body.data).not.toHaveProperty('sellerResidence');
    expect(res.body.data).not.toHaveProperty('sellerLicenseFront');
    expect(res.body.data).not.toHaveProperty('sellerLicenseBack');
  });

  it('returns 404 for non-existent car', async () => {
    const res = await request.get('/api/v1/public/cars/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 404 when car is not available (sold/withdrawn)', async () => {
    const car = await createCar({ carType: 'Renault', model: 'Logan-Sold', status: 'sold' });
    const res = await request.get(`/api/v1/public/cars/${car.id}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/v1/public/settings/numeral_system ──────────────────────────────
describe('Public — GET /api/v1/public/settings/numeral_system', () => {
  it('returns the numeral system (no auth)', async () => {
    const res = await request.get('/api/v1/public/settings/numeral_system');
    expect(res.status).toBe(200);
    expect(['western', 'arabic']).toContain(res.body.data.numeral_system);
  });
});
