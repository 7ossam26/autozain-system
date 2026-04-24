import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { loadSettingsCache, getSetting } from '../../src/config/settingsCache.js';

const request = supertest(app);

function extractCookies(res) {
  return (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

let adminCookies = '';

beforeAll(async () => {
  await loadSettingsCache();

  const res = await request
    .post('/api/v1/auth/login')
    .send({ username: 'superadmin', password: '246810@Ad' });
  adminCookies = extractCookies(res);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── GET /settings ────────────────────────────────────────────────────────────
describe('Settings — GET /api/v1/settings', () => {
  it('returns grouped settings', async () => {
    const res = await request.get('/api/v1/settings').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data).toBe('object');
    // At least one category present
    expect(Object.keys(res.body.data).length).toBeGreaterThan(0);
  });

  it('includes expected setting keys', async () => {
    const res = await request.get('/api/v1/settings').set('Cookie', adminCookies);
    const allKeys = Object.values(res.body.data).flat().map((s) => s.key);
    expect(allKeys).toContain('max_car_images');
    expect(allKeys).toContain('employee_can_edit_car');
    expect(allKeys).toContain('numeral_system');
  });

  it('returns 401 without auth', async () => {
    const res = await request.get('/api/v1/settings');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /settings/:key ───────────────────────────────────────────────────────
describe('Settings — PUT /api/v1/settings/:key', () => {
  const ORIGINAL_MAX_IMAGES = 10;

  afterAll(async () => {
    // Restore max_car_images to default
    await prisma.setting.update({
      where: { key: 'max_car_images' },
      data: { value: String(ORIGINAL_MAX_IMAGES) },
    });
    await loadSettingsCache();
  });

  it('updates a numeric setting', async () => {
    const res = await request
      .put('/api/v1/settings/max_car_images')
      .set('Cookie', adminCookies)
      .send({ value: 15 });

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('max_car_images');
    expect(res.body.data.value).toBe(15);
  });

  it('refreshes the in-memory cache after update', async () => {
    await request
      .put('/api/v1/settings/max_car_images')
      .set('Cookie', adminCookies)
      .send({ value: 7 });

    // Cache should reflect the new value
    expect(getSetting('max_car_images')).toBe(7);
  });

  it('updates a boolean setting', async () => {
    const res = await request
      .put('/api/v1/settings/employee_can_edit_car')
      .set('Cookie', adminCookies)
      .send({ value: true });

    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(true);

    // Restore
    await request
      .put('/api/v1/settings/employee_can_edit_car')
      .set('Cookie', adminCookies)
      .send({ value: false });
  });

  it('returns 404 for non-existent setting key', async () => {
    const res = await request
      .put('/api/v1/settings/this_key_does_not_exist')
      .set('Cookie', adminCookies)
      .send({ value: 'anything' });

    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('NOT_FOUND');
  });

  it('returns 400 when value is missing', async () => {
    const res = await request
      .put('/api/v1/settings/max_car_images')
      .set('Cookie', adminCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('creates an audit log entry on update', async () => {
    const setting = await prisma.setting.findUnique({ where: { key: 'default_commission' } });

    await request
      .put('/api/v1/settings/default_commission')
      .set('Cookie', adminCookies)
      .send({ value: 500 });

    const audit = await prisma.auditLog.findMany({
      where: { entityType: 'setting', entityId: setting.id, action: 'update' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].newValue).toMatchObject({ key: 'default_commission' });

    // Restore
    await request
      .put('/api/v1/settings/default_commission')
      .set('Cookie', adminCookies)
      .send({ value: 0 });

    await prisma.auditLog.deleteMany({
      where: { entityType: 'setting', entityId: setting.id },
    });
  });

  it('returns 401 without auth', async () => {
    const res = await request
      .put('/api/v1/settings/max_car_images')
      .send({ value: 5 });
    expect(res.status).toBe(401);
  });
});

// ─── Settings cache ───────────────────────────────────────────────────────────
describe('Settings — In-memory cache', () => {
  it('getSetting returns correct value for known key', () => {
    const val = getSetting('numeral_system');
    expect(val).toBe('western');
  });

  it('getSetting returns undefined for unknown key', () => {
    expect(getSetting('non_existent_key_xyz')).toBeUndefined();
  });
});
