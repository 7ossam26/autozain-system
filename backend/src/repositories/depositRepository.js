import { prisma } from '../config/db.js';

const DEPOSIT_SELECT = {
  id: true,
  carId: true,
  employeeId: true,
  depositAmount: true,
  buyerName: true,
  buyerPhone: true,
  status: true,
  confirmedBy: true,
  confirmedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  car: { select: { id: true, carType: true, model: true, plateNumber: true, listingPrice: true } },
  employee: { select: { id: true, fullName: true } },
  confirmedByUser: { select: { id: true, fullName: true } },
};

export async function createDepositRequest({ carId, employeeId, depositAmount, buyerName, buyerPhone, notes }) {
  return prisma.depositRequest.create({
    data: { carId, employeeId, depositAmount, buyerName, buyerPhone, notes },
    select: DEPOSIT_SELECT,
  });
}

export async function findDepositById(id) {
  return prisma.depositRequest.findUnique({ where: { id }, select: DEPOSIT_SELECT });
}

export async function listDeposits({ status, page = 1, limit = 20 } = {}) {
  const where = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [deposits, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: DEPOSIT_SELECT,
    }),
    prisma.depositRequest.count({ where }),
  ]);
  return { deposits, total };
}

export async function updateDeposit(id, data) {
  return prisma.depositRequest.update({ where: { id }, data, select: DEPOSIT_SELECT });
}

export async function findPendingDepositForCar(carId) {
  return prisma.depositRequest.findFirst({
    where: { carId, status: 'pending' },
    select: DEPOSIT_SELECT,
  });
}

export async function findLatestDepositForCar(carId) {
  return prisma.depositRequest.findFirst({
    where: { carId, status: { in: ['pending', 'confirmed'] } },
    orderBy: { createdAt: 'desc' },
    select: DEPOSIT_SELECT,
  });
}
