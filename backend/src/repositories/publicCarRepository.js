import { prisma } from '../config/db.js';

// Public projection: NO seller fields, NO audit log.
const PUBLIC_LIST_SELECT = {
  id: true,
  carType: true,
  model: true,
  listingPrice: true,
  plateNumber: true,
  transmission: true,
  fuelType: true,
  odometer: true,
  color: true,
  images: true,
  createdAt: true,
};

const PUBLIC_DETAIL_SELECT = {
  ...PUBLIC_LIST_SELECT,
  licenseInfo: true,
  additionalInfo: true,
  inspectionImageUrl: true,
};

const SORT_MAP = {
  latest:     { createdAt: 'desc' },
  price_asc:  { listingPrice: 'asc' },
  price_desc: { listingPrice: 'desc' },
  km_asc:     { odometer: 'asc' },
};

function buildWhere(filters) {
  const {
    car_type, model, transmission, fuel_type, color,
    price_min, price_max, odometer_min, odometer_max,
    search,
  } = filters;

  const where = { status: 'available' };

  // car_type / model can be a comma-separated list for multi-select
  if (car_type) {
    const brands = String(car_type).split(',').map((s) => s.trim()).filter(Boolean);
    if (brands.length === 1) {
      where.carType = { equals: brands[0], mode: 'insensitive' };
    } else if (brands.length > 1) {
      where.OR = (where.OR ?? []).concat(brands.map((b) => ({ carType: { equals: b, mode: 'insensitive' } })));
    }
  }
  if (model) {
    const models = String(model).split(',').map((s) => s.trim()).filter(Boolean);
    if (models.length === 1) {
      where.model = { equals: models[0], mode: 'insensitive' };
    } else if (models.length > 1) {
      // Combine with AND to keep with brand OR cleanly via separate AND block
      where.AND = (where.AND ?? []).concat([{ OR: models.map((m) => ({ model: { equals: m, mode: 'insensitive' } })) }]);
    }
  }
  if (transmission) where.transmission = transmission;
  if (fuel_type) where.fuelType = fuel_type;
  if (color) where.color = { equals: color, mode: 'insensitive' };

  if (price_min !== undefined || price_max !== undefined) {
    where.listingPrice = {};
    if (price_min !== undefined && price_min !== '') where.listingPrice.gte = Number(price_min);
    if (price_max !== undefined && price_max !== '') where.listingPrice.lte = Number(price_max);
  }

  if (odometer_min !== undefined || odometer_max !== undefined) {
    where.odometer = {};
    if (odometer_min !== undefined && odometer_min !== '') where.odometer.gte = Number(odometer_min);
    if (odometer_max !== undefined && odometer_max !== '') where.odometer.lte = Number(odometer_max);
  }

  if (search) {
    const needle = String(search).trim();
    if (needle) {
      const searchOr = [
        { carType:        { contains: needle, mode: 'insensitive' } },
        { model:          { contains: needle, mode: 'insensitive' } },
        { additionalInfo: { contains: needle, mode: 'insensitive' } },
      ];
      if (where.AND) where.AND.push({ OR: searchOr });
      else where.AND = [{ OR: searchOr }];
    }
  }

  return where;
}

export async function listPublicCars(filters = {}) {
  const { page = 1, limit = 20, sort = 'latest' } = filters;
  const where = buildWhere(filters);
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.latest;
  const skip = (Number(page) - 1) * Number(limit);

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where, skip, take: Number(limit),
      select: PUBLIC_LIST_SELECT, orderBy,
    }),
    prisma.car.count({ where }),
  ]);

  return { cars, total };
}

export async function findPublicCarById(id) {
  // Only available cars are returned publicly.
  return prisma.car.findFirst({
    where: { id, status: 'available' },
    select: PUBLIC_DETAIL_SELECT,
  });
}

// Distinct filter options + price range, computed from currently-available inventory.
export async function getPublicFilterOptions() {
  const baseWhere = { status: 'available' };

  const [brandsRows, modelsRows, priceAgg, odoAgg] = await Promise.all([
    prisma.car.findMany({
      where: baseWhere,
      distinct: ['carType'],
      select: { carType: true },
      orderBy: { carType: 'asc' },
    }),
    prisma.car.findMany({
      where: baseWhere,
      distinct: ['carType', 'model'],
      select: { carType: true, model: true },
      orderBy: [{ carType: 'asc' }, { model: 'asc' }],
    }),
    prisma.car.aggregate({
      where: baseWhere,
      _min: { listingPrice: true },
      _max: { listingPrice: true },
    }),
    prisma.car.aggregate({
      where: baseWhere,
      _min: { odometer: true },
      _max: { odometer: true },
    }),
  ]);

  const modelsByBrand = {};
  for (const row of modelsRows) {
    if (!modelsByBrand[row.carType]) modelsByBrand[row.carType] = [];
    modelsByBrand[row.carType].push(row.model);
  }

  return {
    brands:     brandsRows.map((r) => r.carType),
    modelsByBrand,
    priceRange: {
      min: priceAgg._min.listingPrice ?? 0,
      max: priceAgg._max.listingPrice ?? 0,
    },
    odometerRange: {
      min: odoAgg._min.odometer ?? 0,
      max: odoAgg._max.odometer ?? 0,
    },
  };
}
