import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';

const request = supertest(app);

// Extract name=value pairs only from set-cookie headers
function extractCookies(res) {
  return (res.headers['set-cookie'] || [])
    .map((c) => c.split(';')[0])
    .join('; ');
}

function getCookie(res, name) {
  const cookies = res.headers['set-cookie'] || [];
  return (Array.isArray(cookies) ? cookies : [cookies])
    .find((c) => c.startsWith(`${name}=`)) || null;
}

// Shared session — one login to avoid hitting the rate limiter across tests
let sharedCookies = '';

beforeAll(async () => {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ username: 'superadmin', password: '246810@Ad' });
  sharedCookies = extractCookies(res);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ----------------------------
describe('Auth — POST /api/v1/auth/login', () => {
  it('returns 200 + sets HTTP-only cookies on valid credentials', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin', password: '246810@Ad' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('superadmin');

    const accessCookie  = getCookie(res, 'access_token');
    const refreshCookie = getCookie(res, 'refresh_token');

    expect(accessCookie).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
    expect(accessCookie.toLowerCase()).toContain('httponly');
    expect(refreshCookie.toLowerCase()).toContain('httponly');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 on non-existent username', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ username: 'ghost_user_xyz', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });
});

// ----------------------------
describe('Auth — GET /api/v1/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Cookie', sharedCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('superadmin');
    expect(res.body.data.role.name).toBe('superadmin');
    expect(res.body.data).toHaveProperty('permissions');
  });

  it('returns 401 without cookies', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with tampered access token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Cookie', 'access_token=tampered.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('TOKEN_EXPIRED');
  });
});

// ----------------------------
describe('Auth — POST /api/v1/auth/logout', () => {
  it('clears cookies on logout', async () => {
    const logoutRes = await request
      .post('/api/v1/auth/logout')
      .set('Cookie', sharedCookies);

    expect(logoutRes.status).toBe(200);

    const setCookies = (logoutRes.headers['set-cookie'] || []).join('|');
    expect(setCookies).toContain('access_token=;');
  });
});

// ----------------------------
describe('Auth — POST /api/v1/auth/refresh-token', () => {
  it('issues new token pair on valid refresh cookie', async () => {
    const refreshRes = await request
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', sharedCookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.refreshed).toBe(true);

    const newAccessCookie = getCookie(refreshRes, 'access_token');
    expect(newAccessCookie).toBeTruthy();
  });

  it('returns 401 with no refresh cookie', async () => {
    const res = await request.post('/api/v1/auth/refresh-token');
    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('NO_REFRESH_TOKEN');
  });

  it('returns 401 with invalid refresh cookie', async () => {
    const res = await request
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', 'refresh_token=bad.token.here');

    expect(res.status).toBe(401);
    expect(res.body.error_code).toBe('INVALID_REFRESH_TOKEN');
  });
});

// ----------------------------
describe('Auth — Rate limiting (login)', () => {
  it('blocks after 5 failed attempts from same IP+username', async () => {
    const username = `ratelimit_test_${Date.now()}`;
    const fakeIp   = '10.99.99.1';

    for (let i = 0; i < 5; i++) {
      await request
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', fakeIp)
        .send({ username, password: 'wrong' });
    }

    const blocked = await request
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', fakeIp)
      .send({ username, password: 'wrong' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error_code).toBe('RATE_LIMITED');
  });
});
