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

export async function setUserStatus(id, status) {
  return prisma.user.update({
    where: { id },
    data: { status },
    include: { role: true },
  });
}

export async function savePushSubscription(id, subscription) {
  return prisma.user.update({
    where: { id },
    data: { pushSubscription: subscription },
  });
}

export async function listEmployeesPublic() {
  // Employees whose role is `employee` and are currently online/available/busy.
  // Excludes offline from the public list (they cannot receive contact requests).
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: 'employee' },
      status: { in: ['available', 'busy'] },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      status: true,
    },
    orderBy: { fullName: 'asc' },
  });
}

export async function listEmployeesForMonitor() {
  // Full employee list for team-manager monitor page (includes offline).
  return prisma.user.findMany({
    where: { isActive: true, role: { name: 'employee' } },
    select: {
      id: true, fullName: true, avatarUrl: true, status: true, maxConcurrent: true,
    },
    orderBy: { fullName: 'asc' },
  });
}
