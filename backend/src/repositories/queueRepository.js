import { prisma } from '../config/db.js';

const QUEUE_SELECT = {
  id: true,
  buyerName: true,
  buyerPhone: true,
  interestedCarId: true,
  status: true,
  assignedEmployeeId: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true,
  interestedCar: { select: { id: true, carType: true, model: true } },
};

export async function enqueueBuyer({ buyerName, buyerPhone, interestedCarId }) {
  return prisma.buyerQueue.create({
    data: { buyerName, buyerPhone, interestedCarId, status: 'waiting' },
    select: QUEUE_SELECT,
  });
}

export async function listWaitingQueue() {
  return prisma.buyerQueue.findMany({
    where: { status: 'waiting' },
    orderBy: { createdAt: 'asc' },
    select: QUEUE_SELECT,
  });
}

export async function findOldestWaiting() {
  return prisma.buyerQueue.findFirst({
    where: { status: 'waiting' },
    orderBy: { createdAt: 'asc' },
    select: QUEUE_SELECT,
  });
}

export async function assignQueueEntry(id, employeeId) {
  return prisma.buyerQueue.update({
    where: { id },
    data: { status: 'assigned', assignedEmployeeId: employeeId, assignedAt: new Date() },
    select: QUEUE_SELECT,
  });
}

export async function expireQueueEntry(id) {
  return prisma.buyerQueue.update({
    where: { id },
    data: { status: 'expired' },
    select: QUEUE_SELECT,
  });
}
