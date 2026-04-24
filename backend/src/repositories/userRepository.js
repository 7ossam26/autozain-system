import { prisma } from '../config/db.js';

export async function findUserByUsername(username) {
  return prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });
}

export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

export async function listUsers({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return { users, total };
}

export async function createUser({ username, passwordHash, fullName, roleId, createdBy }) {
  return prisma.user.create({
    data: { username, passwordHash, fullName, roleId, createdBy },
    include: { role: true },
  });
}

export async function updateUser(id, { fullName, roleId, isActive, maxConcurrent }) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(roleId !== undefined && { roleId }),
      ...(isActive !== undefined && { isActive }),
      ...(maxConcurrent !== undefined && { maxConcurrent }),
    },
    include: { role: true },
  });
}

export async function updateUserPassword(id, passwordHash) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}

export async function countUsersByRole(roleId) {
  return prisma.user.count({ where: { roleId } });
}
