import { prisma } from '../config/db.js';

const CONTACT_SELECT = {
  id: true,
  buyerName: true,
  buyerPhone: true,
  employeeId: true,
  interestedCarId: true,
  status: true,
  acceptedAt: true,
  completedAt: true,
  outcome: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { id: true, fullName: true, status: true } },
  interestedCar: { select: { id: true, carType: true, model: true, listingPrice: true, images: true } },
};

export async function createContactRequest({ buyerName, buyerPhone, employeeId, interestedCarId }) {
  return prisma.contactRequest.create({
    data: { buyerName, buyerPhone, employeeId, interestedCarId },
    select: CONTACT_SELECT,
  });
}

export async function findContactRequestById(id) {
  return prisma.contactRequest.findUnique({ where: { id }, select: CONTACT_SELECT });
}

export async function updateContactRequest(id, data) {
  return prisma.contactRequest.update({ where: { id }, data, select: CONTACT_SELECT });
}

export async function listPendingForEmployee(employeeId) {
  return prisma.contactRequest.findMany({
    where: { employeeId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    select: CONTACT_SELECT,
  });
}

export async function listActiveForEmployee(employeeId) {
  return prisma.contactRequest.findMany({
    where: { employeeId, status: 'accepted' },
    orderBy: { acceptedAt: 'desc' },
    select: CONTACT_SELECT,
  });
}

export async function countRecentRequestsFromIp(_ip, _sinceMs) {
  // Not persisted — IP-based rate limiting is handled by express-rate-limit middleware.
  // Kept here for API symmetry; always returns 0.
  return 0;
}

/** Find pending requests older than cutoff for timeout sweep. */
export async function findExpiredPending(cutoff) {
  return prisma.contactRequest.findMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
    select: CONTACT_SELECT,
  });
}

export async function markExpired(id) {
  return prisma.contactRequest.update({
    where: { id },
    data: { status: 'expired' },
    select: CONTACT_SELECT,
  });
}
