import { prisma } from '../config/db.js';

const CAR_LIST_SELECT = {
  id: true,
  carType: true,
  model: true,
  listingPrice: true,
  plateNumber: true,
  transmission: true,
  fuelType: true,
  odometer: true,
  color: true,
  status: true,
  images: true,
  createdAt: true,
  addedByUser: { select: { id: true, fullName: true } },
};

const CAR_FULL_SELECT = {
  ...CAR_LIST_SELECT,
  licenseInfo: true,
  additionalInfo: true,
  inspectionImageUrl: true,
  sellerName: true,
  sellerPhone: true,
  sellerResidence: true,
  sellerLicenseFront: true,
  sellerLicenseBack: true,
  updatedAt: true,
};

/**
 * @param {{
 *   page?: number, limit?: number,
 *   status?: string, car_type?: string, model?: string,
 *   transmission?: string, fuel_type?: string,
 *   price_min?: number, price_max?: number,
 *   odometer_min?: number, odometer_max?: number,
 *   search?: string,
 * }} filters
 */
export async function listCars(filters = {}) {
  const {
    page = 1, limit = 20,
    status, car_type, model, transmission, fuel_type,
    price_min, price_max, odometer_min, odometer_max,
    search,
  } = filters;

  const where = {};

  if (status) where.status = status;
  if (car_type) where.carType = { contains: car_type, mode: 'insensitive' };
  if (model) where.model = { contains: model, mode: 'insensitive' };
  if (transmission) where.transmission = transmission;
  if (fuel_type) where.fuelType = fuel_type;

  if (price_min !== undefined || price_max !== undefined) {
    where.listingPrice = {};
    if (price_min !== undefined) where.listingPrice.gte = Number(price_min);
    if (price_max !== undefined) where.listingPrice.lte = Number(price_max);
  }

  if (odometer_min !== undefined || odometer_max !== undefined) {
    where.odometer = {};
    if (odometer_min !== undefined) where.odometer.gte = Number(odometer_min);
    if (odometer_max !== undefined) where.odometer.lte = Number(odometer_max);
  }

  if (search) {
    where.OR = [
      { carType: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { additionalInfo: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [cars, total] = await Promise.all([
    prisma.car.findMany({ where, skip, take: Number(limit), select: CAR_LIST_SELECT, orderBy: { createdAt: 'desc' } }),
    prisma.car.count({ where }),
  ]);

  return { cars, total };
}

const CAR_NO_SELLER_SELECT = (() => {
  const s = { ...CAR_FULL_SELECT };
  delete s.sellerName;
  delete s.sellerPhone;
  delete s.sellerResidence;
  delete s.sellerLicenseFront;
  delete s.sellerLicenseBack;
  return s;
})();

export async function findCarById(id, includeSeller = false) {
  return prisma.car.findUnique({
    where: { id },
    select: includeSeller ? CAR_FULL_SELECT : CAR_NO_SELLER_SELECT,
  });
}

export async function findCarByIdFull(id) {
  return prisma.car.findUnique({ where: { id }, select: CAR_FULL_SELECT });
}

export async function createCar(data) {
  return prisma.car.create({ data, select: CAR_FULL_SELECT });
}

export async function updateCar(id, data) {
  return prisma.car.update({ where: { id }, data, select: CAR_FULL_SELECT });
}

export async function updateCarStatus(id, status) {
  return prisma.car.update({ where: { id }, data: { status }, select: CAR_FULL_SELECT });
}

export async function deleteCar(id) {
  return prisma.car.delete({ where: { id } });
}

export async function getCarAuditLog(carId) {
  return prisma.auditLog.findMany({
    where: { entityType: 'car', entityId: carId },
    orderBy: { createdAt: 'desc' },
    include: { performer: { select: { id: true, fullName: true } } },
  });
}

export async function listArchivedCars(filters = {}) {
  const { page = 1, limit = 20, search, status } = filters;

  const validArchiveStatuses = ['sold', 'withdrawn'];
  const statusFilter = status && validArchiveStatuses.includes(status)
    ? status
    : { in: validArchiveStatuses };

  const where = { status: statusFilter };

  if (search) {
    where.OR = [
      { carType: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { plateNumber: { contains: search, mode: 'insensitive' } },
      { sellerName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      skip,
      take: Number(limit),
      select: CAR_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.car.count({ where }),
  ]);

  return { cars, total };
}

export async function importCars(rows) {
  return prisma.car.createMany({ data: rows, skipDuplicates: false });
}

export async function listAllCars(filters = {}) {
  const {
    status, car_type, model, transmission, fuel_type,
    price_min, price_max, odometer_min, odometer_max,
    search,
  } = filters;

  const where = {};
  if (status) where.status = status;
  if (car_type) where.carType = { contains: car_type, mode: 'insensitive' };
  if (model) where.model = { contains: model, mode: 'insensitive' };
  if (transmission) where.transmission = transmission;
  if (fuel_type) where.fuelType = fuel_type;

  if (price_min !== undefined || price_max !== undefined) {
    where.listingPrice = {};
    if (price_min !== undefined) where.listingPrice.gte = Number(price_min);
    if (price_max !== undefined) where.listingPrice.lte = Number(price_max);
  }

  if (odometer_min !== undefined || odometer_max !== undefined) {
    where.odometer = {};
    if (odometer_min !== undefined) where.odometer.gte = Number(odometer_min);
    if (odometer_max !== undefined) where.odometer.lte = Number(odometer_max);
  }

  if (search) {
    where.OR = [
      { carType: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { additionalInfo: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.car.findMany({
    where,
    select: CAR_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });
}
