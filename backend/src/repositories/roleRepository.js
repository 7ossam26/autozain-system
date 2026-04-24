import { prisma } from '../config/db.js';

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function findRoleByName(name) {
  return prisma.role.findUnique({ where: { name } });
}

export async function findRoleById(id) {
  return prisma.role.findUnique({ where: { id } });
}
