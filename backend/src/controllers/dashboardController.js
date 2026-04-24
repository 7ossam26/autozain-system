import { prisma } from '../config/db.js';

export async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCars,
      carsAvailable,
      carsDepositPaid,
      carsSold,
      carsWithdrawn,
      totalUsers,
      activeEmployees,
      salesThisMonth,
      revenueResult,
    ] = await Promise.all([
      prisma.car.count(),
      prisma.car.count({ where: { status: 'available' } }),
      prisma.car.count({ where: { status: 'deposit_paid' } }),
      prisma.car.count({ where: { status: 'sold' } }),
      prisma.car.count({ where: { status: 'withdrawn' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { status: { in: ['available', 'busy'] }, isActive: true } }),
      prisma.sale.count({ where: { saleDate: { gte: startOfMonth } } }),
      prisma.sale.aggregate({
        _sum: { dealershipRevenue: true },
        where: { saleDate: { gte: startOfMonth } },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalCars,
        carsAvailable,
        carsDepositPaid,
        carsSold,
        carsWithdrawn,
        carsArchived: carsSold + carsWithdrawn,
        totalUsers,
        activeEmployees,
        salesThisMonth,
        revenueThisMonth: revenueResult._sum.dealershipRevenue ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}
