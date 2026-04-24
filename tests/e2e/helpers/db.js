import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
export const prisma = new PrismaClient();

const E2E_PREFIX = 'e2e_';

export async function runPrismaSeed() {
  await execAsync('npm --workspace backend run prisma:seed', {
    cwd: process.cwd(),
    env: process.env,
  });
}

export async function resetE2EData() {
  await runPrismaSeed();

  const users = await prisma.user.findMany({
    where: { username: { startsWith: E2E_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const cars = await prisma.car.findMany({
    where: {
      OR: [
        { carType: { startsWith: 'E2E' } },
        ...(userIds.length ? [{ addedBy: { in: userIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const carIds = cars.map((c) => c.id);

  const saleClauses = [
    ...(carIds.length ? [{ carId: { in: carIds } }] : []),
    ...(userIds.length ? [{ employeeId: { in: userIds } }, { closedBy: { in: userIds } }] : []),
  ];
  if (saleClauses.length) {
    await prisma.sale.deleteMany({ where: { OR: saleClauses } });
  }

  const depositClauses = [
    ...(carIds.length ? [{ carId: { in: carIds } }] : []),
    ...(userIds.length ? [{ employeeId: { in: userIds } }, { confirmedBy: { in: userIds } }] : []),
  ];
  if (depositClauses.length) {
    await prisma.depositRequest.deleteMany({ where: { OR: depositClauses } });
  }
  await prisma.contactRequest.deleteMany({
    where: {
      OR: [
        { buyerName: { startsWith: 'E2E' } },
        ...(carIds.length ? [{ interestedCarId: { in: carIds } }] : []),
        ...(userIds.length ? [{ employeeId: { in: userIds } }] : []),
      ],
    },
  });
  await prisma.buyerQueue.deleteMany({
    where: {
      OR: [
        { buyerName: { startsWith: 'E2E' } },
        ...(carIds.length ? [{ interestedCarId: { in: carIds } }] : []),
        ...(userIds.length ? [{ assignedEmployeeId: { in: userIds } }] : []),
      ],
    },
  });
  const auditClauses = [
    ...(userIds.length ? [{ performedBy: { in: userIds } }] : []),
    ...(carIds.length ? [{ entityId: { in: carIds } }] : []),
  ];
  if (auditClauses.length) {
    await prisma.auditLog.deleteMany({ where: { OR: auditClauses } });
  }
  if (carIds.length) await prisma.car.deleteMany({ where: { id: { in: carIds } } });
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  await prisma.setting.update({ where: { key: 'numeral_system' }, data: { value: '"western"' } });
  await prisma.setting.update({ where: { key: 'buyer_can_attach_car' }, data: { value: 'false' } });
  await prisma.setting.update({ where: { key: 'request_timeout_minutes' }, data: { value: '5' } });
  await refreshServerSettingsCache().catch(() => {});
}

async function refreshServerSettingsCache() {
  const login = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `10.241.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
    },
    body: JSON.stringify({ username: 'superadmin', password: '246810@Ad' }),
  });
  if (!login.ok) return;

  const rawSetCookie = login.headers.get('set-cookie') ?? '';
  const cookie = rawSetCookie
    .split(/,\s*(?=(?:access_token|refresh_token)=)/)
    .map((part) => part.split(';')[0])
    .join('; ');

  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  await fetch('http://127.0.0.1:3000/api/v1/settings/numeral_system', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value: 'western' }),
  });
  await fetch('http://127.0.0.1:3000/api/v1/settings/buyer_can_attach_car', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value: false }),
  });
  await fetch('http://127.0.0.1:3000/api/v1/settings/request_timeout_minutes', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value: 5 }),
  });
}

export async function createE2EUser(roleName, overrides = {}) {
  const password = overrides.password ?? 'TestPass@1';
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  return prisma.user.create({
    data: {
      username: overrides.username ?? `${E2E_PREFIX}${roleName}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: overrides.fullName ?? `E2E ${roleName}`,
      roleId: role.id,
      status: overrides.status ?? (roleName === 'employee' ? 'available' : 'offline'),
      isActive: true,
      maxConcurrent: overrides.maxConcurrent ?? 1,
    },
    include: { role: true },
  });
}

export async function createE2ECar(overrides = {}) {
  if (!overrides.addedBy) throw new Error('createE2ECar requires addedBy');
  return prisma.car.create({
    data: {
      carType: overrides.carType ?? 'E2EBrand',
      model: overrides.model ?? `Model-${Date.now()}`,
      listingPrice: overrides.listingPrice ?? 300000,
      licenseInfo: overrides.licenseInfo ?? 'رخصة اختبار',
      transmission: overrides.transmission ?? 'automatic',
      plateNumber: overrides.plateNumber ?? `E2E-${Math.random().toString(16).slice(2, 8)}`,
      odometer: overrides.odometer ?? 30000,
      color: overrides.color ?? 'أبيض',
      fuelType: overrides.fuelType ?? 'benzine',
      additionalInfo: overrides.additionalInfo ?? 'عربية نظيفة للاختبار',
      inspectionImageUrl: overrides.inspectionImageUrl ?? null,
      status: overrides.status ?? 'available',
      images: overrides.images ?? [],
      sellerName: overrides.sellerName ?? 'E2E Seller Hidden',
      sellerPhone: overrides.sellerPhone ?? '01000000000',
      sellerResidence: overrides.sellerResidence ?? 'القاهرة',
      addedBy: overrides.addedBy,
    },
    include: { addedByUser: true },
  });
}

export async function createDepositFixture({ employeeId, cfoId } = {}) {
  const car = await createE2ECar({
    addedBy: employeeId,
    carType: 'E2EFinance',
    model: `Deposit-${Date.now()}`,
    status: 'deposit_paid',
    listingPrice: 350000,
  });
  const deposit = await prisma.depositRequest.create({
    data: {
      carId: car.id,
      employeeId,
      depositAmount: 20000,
      buyerName: 'E2E Finance Buyer',
      buyerPhone: '01012345678',
      status: 'pending',
    },
  });
  return { car, deposit, cfoId };
}
