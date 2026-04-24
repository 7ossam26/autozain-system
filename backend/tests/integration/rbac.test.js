import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';

const request = supertest(app);

async function loginAs(username, password = 'TestPass@1') {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ username, password });
  return (res.headers['set-cookie'] || []).join('; ');
}

let superadminCookies = '';
let employeeCookies   = '';
let employeeId        = '';

beforeAll(async () => {
  superadminCookies = await loginAs('superadmin', '246810@Ad');

  // Create a test employee user
  const role = await prisma.role.findUnique({ where: { name: 'employee' } });
  const hash  = await bcrypt.hash('TestPass@1', 12);

  const user = await prisma.user.upsert({
    where: { username: 'test_employee_rbac' },
    update: {},
    create: {
      username: 'test_employee_rbac',
      passwordHash: hash,
      fullName: 'Test Employee',
      roleId: role.id,
    },
  });
  employeeId      = user.id;
  employeeCookies = await loginAs('test_employee_rbac');
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: 'test_employee_rbac' } });
  await prisma.$disconnect();
});

describe('RBAC — SuperAdmin bypass', () => {
  it('SuperAdmin can access users list', async () => {
    const res = await request
      .get('/api/v1/users')
      .set('Cookie', superadminCookies);
    expect(res.status).toBe(200);
  });

  it('SuperAdmin can access permissions matrix', async () => {
    const res = await request
      .get('/api/v1/permissions')
      .set('Cookie', superadminCookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('matrix');
    expect(res.body.data).toHaveProperty('roles');
    expect(res.body.data).toHaveProperty('moduleKeys');
  });
});

describe('RBAC — Employee restrictions', () => {
  it('Employee cannot access users list (no users_view)', async () => {
    const res = await request
      .get('/api/v1/users')
      .set('Cookie', employeeCookies);
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('Employee cannot access permissions matrix', async () => {
    const res = await request
      .get('/api/v1/permissions')
      .set('Cookie', employeeCookies);
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('Employee cannot create users', async () => {
    const res = await request
      .post('/api/v1/users')
      .set('Cookie', employeeCookies)
      .send({ username: 'ghost', password: 'abc123', fullName: 'Ghost', roleId: 'fake' });
    expect(res.status).toBe(403);
  });

  it('Employee cannot delete users', async () => {
    const res = await request
      .delete(`/api/v1/users/${employeeId}`)
      .set('Cookie', employeeCookies);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — Unauthenticated requests', () => {
  it('returns 401 on /users without auth', async () => {
    const res = await request.get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('returns 401 on /permissions without auth', async () => {
    const res = await request.get('/api/v1/permissions');
    expect(res.status).toBe(401);
  });
});

describe('RBAC — Permission toggle', () => {
  it('SuperAdmin can enable a permission for a role', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });

    const res = await request
      .patch(`/api/v1/permissions/${role.id}/users_view`)
      .set('Cookie', superadminCookies)
      .send({ isEnabled: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('SuperAdmin can disable a permission for a role', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });

    const res = await request
      .patch(`/api/v1/permissions/${role.id}/users_view`)
      .set('Cookie', superadminCookies)
      .send({ isEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('RBAC — User management guard (SuperAdmin protection)', () => {
  it('Cannot delete SuperAdmin user', async () => {
    const superAdmin = await prisma.user.findUnique({ where: { username: 'superadmin' } });

    const res = await request
      .delete(`/api/v1/users/${superAdmin.id}`)
      .set('Cookie', superadminCookies);

    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });
});
