import { prisma } from '../config/db.js';

export async function getModuleAccessByRoleId(roleId) {
  const rows = await prisma.moduleAccess.findMany({ where: { roleId } });
  return Object.fromEntries(rows.map((r) => [r.moduleKey, r.isEnabled]));
}

export async function getAllModuleAccess() {
  return prisma.moduleAccess.findMany({
    include: { role: true },
    orderBy: [{ roleId: 'asc' }, { moduleKey: 'asc' }],
  });
}

export async function setModuleAccess(roleId, moduleKey, isEnabled, updatedBy) {
  return prisma.moduleAccess.upsert({
    where: { roleId_moduleKey: { roleId, moduleKey } },
    update: { isEnabled, updatedBy },
    create: { roleId, moduleKey, isEnabled, updatedBy },
  });
}

export async function checkModuleAccess(roleId, moduleKey) {
  const row = await prisma.moduleAccess.findUnique({
    where: { roleId_moduleKey: { roleId, moduleKey } },
  });
  return row?.isEnabled ?? false;
}
