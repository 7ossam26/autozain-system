import { prisma } from '../config/db.js';

export async function listSettings() {
  return prisma.setting.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
}

export async function findSettingByKey(key) {
  return prisma.setting.findUnique({ where: { key } });
}

export async function updateSetting(key, value, updatedBy) {
  return prisma.setting.update({
    where: { key },
    data: { value, updatedBy },
  });
}
