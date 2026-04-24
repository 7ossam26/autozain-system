import { prisma } from '../config/db.js';

const SALE_SELECT = {
  id: true,
  carId: true,
  employeeId: true,
  closedBy: true,
  finalSalePrice: true,
  sellerReceived: true,
  dealershipRevenue: true,
  employeeCommission: true,
  depositAmount: true,
  taxPercentage: true,
  taxAmount: true,
  buyerName: true,
  buyerPhone: true,
  paymentMethod: true,
  notes: true,
  saleDate: true,
  createdAt: true,
  updatedAt: true,
  car: {
    select: {
      id: true,
      carType: true,
      model: true,
      plateNumber: true,
      listingPrice: true,
      sellerName: true,
      sellerPhone: true,
    },
  },
  employee: { select: { id: true, fullName: true } },
  closedByUser: { select: { id: true, fullName: true } },
};

export async function createSale(data) {
  return prisma.sale.create({ data, select: SALE_SELECT });
}

export async function findSaleById(id) {
  return prisma.sale.findUnique({ where: { id }, select: SALE_SELECT });
}

export async function findSaleByCarId(carId) {
  return prisma.sale.findFirst({ where: { carId }, select: SALE_SELECT });
}

function buildSaleWhere({ startDate, endDate, employeeId, carType } = {}) {
  const where = {};
  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) where.saleDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.saleDate.lte = end;
    }
  }
  if (employeeId) where.employeeId = employeeId;
  if (carType) where.car = { carType: { contains: carType, mode: 'insensitive' } };
  return where;
}

export async function listSales({ startDate, endDate, employeeId, carType, page = 1, limit = 20 } = {}) {
  const where = buildSaleWhere({ startDate, endDate, employeeId, carType });
  const skip = (page - 1) * limit;
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { saleDate: 'desc' },
      select: SALE_SELECT,
    }),
    prisma.sale.count({ where }),
  ]);
  return { sales, total };
}

export async function listSalesForExport({ startDate, endDate, employeeId, carType } = {}) {
  const where = buildSaleWhere({ startDate, endDate, employeeId, carType });
  return prisma.sale.findMany({
    where,
    orderBy: { saleDate: 'desc' },
    select: SALE_SELECT,
  });
}

export async function getSaleStats() {
  const [salesCount, revenueAgg, commissionsAgg, pendingDeposits] = await Promise.all([
    prisma.sale.count(),
    prisma.sale.aggregate({ _sum: { dealershipRevenue: true } }),
    prisma.sale.aggregate({ _sum: { employeeCommission: true } }),
    prisma.depositRequest.count({ where: { status: 'pending' } }),
  ]);
  return {
    salesCount,
    totalRevenue: revenueAgg._sum.dealershipRevenue ?? 0,
    totalCommissions: commissionsAgg._sum.employeeCommission ?? 0,
    pendingDeposits,
  };
}
