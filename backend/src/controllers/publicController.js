import {
  listPublicCars, findPublicCarById, getPublicFilterOptions,
} from '../repositories/publicCarRepository.js';
import { listEmployeesPublic } from '../repositories/userRepository.js';
import { getSetting } from '../config/settingsCache.js';

const ALLOWED_SORT = new Set(['latest', 'price_asc', 'price_desc', 'km_asc']);
const ALLOWED_TRANSMISSION = new Set(['automatic', 'manual']);
const ALLOWED_FUEL = new Set(['benzine', 'diesel', 'gas', 'electric', 'hybrid']);

export async function getPublicCars(req, res, next) {
  try {
    const {
      page = 1, limit = 20, sort = 'latest',
      car_type, model, transmission, fuel_type, color,
      price_min, price_max, odometer_min, odometer_max,
      search,
      include_filters,
    } = req.query;

    // Validate/normalize
    const safeSort = ALLOWED_SORT.has(sort) ? sort : 'latest';
    const safeTrans = transmission && ALLOWED_TRANSMISSION.has(transmission) ? transmission : undefined;
    const safeFuel  = fuel_type && ALLOWED_FUEL.has(fuel_type) ? fuel_type : undefined;

    const { cars, total } = await listPublicCars({
      page: Number(page), limit: Math.min(Number(limit) || 20, 50),
      sort: safeSort,
      car_type, model,
      transmission: safeTrans, fuel_type: safeFuel, color,
      price_min, price_max, odometer_min, odometer_max,
      search,
    });

    const payload = {
      success: true,
      data: cars,
      meta: { total, page: Number(page), limit: Number(limit) },
    };

    // Filter options are expensive-ish (distinct queries); only send when asked.
    if (include_filters === '1' || include_filters === 'true') {
      payload.filters = await getPublicFilterOptions();
    }

    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getPublicCarById(req, res, next) {
  try {
    const car = await findPublicCarById(req.params.id);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'العربية مش موجودة أو مش متاحة',
        error_code: 'NOT_FOUND',
      });
    }
    return res.json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
}

export async function getPublicNumeralSystem(req, res) {
  const value = getSetting('numeral_system') ?? 'western';
  return res.json({ success: true, data: { numeral_system: value } });
}

// Employees visible to buyers: only those who are currently available or busy.
export async function getPublicEmployees(req, res, next) {
  try {
    const employees = await listEmployeesPublic();
    const buyerCanAttachCar = getSetting('buyer_can_attach_car') === true;
    return res.json({
      success: true,
      data: employees,
      meta: { buyerCanAttachCar },
    });
  } catch (err) {
    next(err);
  }
}
