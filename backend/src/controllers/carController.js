import { ROLE_NAMES } from '../config/constants.js';
import { getSetting } from '../config/settingsCache.js';
import { logAudit } from '../utils/auditLogger.js';
import { looksLikeEgyptianMobile } from '../utils/validators.js';
import {
  listCars, findCarByIdFull, createCar, updateCar,
  updateCarStatus, deleteCar, getCarAuditLog,
} from '../repositories/carRepository.js';

// ─── State machine ────────────────────────────────────────────────────────────

// Valid "to" states per "from" state
const VALID_TRANSITIONS = {
  available:    ['deposit_paid', 'withdrawn'],
  deposit_paid: ['available', 'sold'],
  sold:         [],
  withdrawn:    ['available'],
};

// Transitions that only admins/superadmins may perform
const ADMIN_ONLY_TRANSITIONS = new Set([
  'withdrawn->available',
]);

// Transitions blocked for employees when setting is off
const EMPLOYEE_TRANSITIONS_NEED_SETTING = new Set([
  'available->deposit_paid',
  'available->withdrawn',
  'deposit_paid->available',
  'deposit_paid->sold',
]);

function isAdminOrAbove(roleName) {
  return [ROLE_NAMES.SUPERADMIN, ROLE_NAMES.ADMIN].includes(roleName);
}

function validateTransition(fromStatus, toStatus, roleName) {
  const allowed = VALID_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    return `لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}"`;
  }

  const key = `${fromStatus}->${toStatus}`;

  if (ADMIN_ONLY_TRANSITIONS.has(key) && !isAdminOrAbove(roleName)) {
    return 'هذا التغيير يتطلب صلاحيات مدير';
  }

  if (roleName === ROLE_NAMES.EMPLOYEE && EMPLOYEE_TRANSITIONS_NEED_SETTING.has(key)) {
    const canChangeStatus = getSetting('employee_can_change_status');
    if (!canChangeStatus) {
      return 'تغيير حالة العربية غير مفعّل للموظفين حالياً';
    }
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileUrl(req, file) {
  if (!file) return null;
  // Build URL relative to backend — /uploads/subdir/filename
  return `/uploads/${file.path.replace(/\\/g, '/').split('/uploads/')[1]}`;
}

function buildImageUrls(req, files) {
  if (!files?.images) return [];
  return files.images.map((f) => fileUrl(req, f));
}

function hasSellerAccess(roleName) {
  return [ROLE_NAMES.SUPERADMIN, ROLE_NAMES.ADMIN, ROLE_NAMES.CFO, ROLE_NAMES.TEAM_MANAGER].includes(roleName)
    || roleName === ROLE_NAMES.EMPLOYEE; // employees add cars so they need to see seller info they entered
}

function stripSellerFields(car) {
  const { sellerName, sellerPhone, sellerResidence, sellerLicenseFront, sellerLicenseBack, ...rest } = car;
  return rest;
}

function formatCar(car, includeSeller) {
  if (!includeSeller) return stripSellerFields(car);
  return car;
}

function parseIntOrNull(val) {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  if (!Number.isInteger(n) || isNaN(n)) return NaN;
  return n;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function getCars(req, res, next) {
  try {
    const {
      page = 1, limit = 20,
      status, car_type, model, transmission, fuel_type,
      price_min, price_max, odometer_min, odometer_max,
      search,
    } = req.query;

    const { cars, total } = await listCars({
      page: Number(page), limit: Math.min(Number(limit), 100),
      status, car_type, model, transmission, fuel_type,
      price_min, price_max, odometer_min, odometer_max,
      search,
    });

    return res.json({
      success: true,
      data: cars,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCarById(req, res, next) {
  try {
    const car = await findCarByIdFull(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }

    const includeSeller = hasSellerAccess(req.user.roleName);
    const auditLog = await getCarAuditLog(car.id);

    return res.json({
      success: true,
      data: { ...formatCar(car, includeSeller), auditLog },
    });
  } catch (err) {
    next(err);
  }
}

export async function addCar(req, res, next) {
  try {
    const files = req.files ?? {};
    const body = req.body ?? {};

    // Required fields
    const { car_type, model, listing_price, seller_name, seller_phone } = body;
    const missing = [];
    if (!car_type) missing.push('car_type');
    if (!model) missing.push('model');
    if (listing_price === undefined || listing_price === '') missing.push('listing_price');
    if (!seller_name) missing.push('seller_name');
    if (!seller_phone) missing.push('seller_phone');

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `الحقول التالية مطلوبة: ${missing.join(', ')}`,
        error_code: 'VALIDATION_ERROR',
      });
    }

    // Integer-only price
    const priceInt = parseIntOrNull(listing_price);
    if (isNaN(priceInt) || priceInt < 0) {
      return res.status(400).json({
        success: false,
        message: 'سعر العرض يجب أن يكون رقم صحيح بدون كسور',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const odoInt = parseIntOrNull(body.odometer);
    if (body.odometer !== undefined && (isNaN(odoInt) || odoInt < 0)) {
      return res.status(400).json({
        success: false,
        message: 'قراءة العداد يجب أن تكون رقم صحيح',
        error_code: 'VALIDATION_ERROR',
      });
    }

    // Enforce max_car_images from settings
    const maxImages = getSetting('max_car_images') ?? 10;
    const uploadedImages = files.images ?? [];
    if (uploadedImages.length > maxImages) {
      return res.status(400).json({
        success: false,
        message: `الحد الأقصى لعدد الصور هو ${maxImages}`,
        error_code: 'TOO_MANY_IMAGES',
      });
    }

    const imageUrls = uploadedImages.map((f) => fileUrl(req, f));
    const inspectionUrl = files.inspection_image?.[0] ? fileUrl(req, files.inspection_image[0]) : null;
    const licenseFrontUrl = files.seller_license_front?.[0] ? fileUrl(req, files.seller_license_front[0]) : null;
    const licenseBackUrl = files.seller_license_back?.[0] ? fileUrl(req, files.seller_license_back[0]) : null;

    const phoneWarning = !looksLikeEgyptianMobile(seller_phone)
      ? 'رقم الهاتف ممكن يكون غلط — راجعه'
      : null;

    const car = await createCar({
      carType: car_type,
      model,
      listingPrice: priceInt,
      licenseInfo: body.license_info ?? '',
      transmission: body.transmission ?? 'manual',
      plateNumber: body.plate_number ?? '',
      odometer: odoInt ?? 0,
      color: body.color ?? null,
      fuelType: body.fuel_type ?? null,
      additionalInfo: body.additional_info ?? null,
      inspectionImageUrl: inspectionUrl,
      images: imageUrls,
      sellerName: seller_name,
      sellerPhone: seller_phone,
      sellerResidence: body.seller_residence ?? '',
      sellerLicenseFront: licenseFrontUrl,
      sellerLicenseBack: licenseBackUrl,
      addedBy: req.user.userId,
    });

    await logAudit({
      entityType: 'car',
      entityId: car.id,
      action: 'create',
      newValue: { carType: car.carType, model: car.model, listingPrice: car.listingPrice, status: car.status },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: car,
      ...(phoneWarning && { warning: phoneWarning }),
    });
  } catch (err) {
    next(err);
  }
}

export async function editCar(req, res, next) {
  try {
    const car = await findCarByIdFull(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }

    // Employee edit setting check
    if (req.user.roleName === ROLE_NAMES.EMPLOYEE) {
      const canEdit = getSetting('employee_can_edit_car');
      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'تعديل بيانات العربية غير مفعّل للموظفين حالياً',
          error_code: 'FORBIDDEN',
        });
      }
    }

    const body = req.body ?? {};
    const files = req.files ?? {};
    const updateData = {};

    if (body.car_type !== undefined) updateData.carType = body.car_type;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.license_info !== undefined) updateData.licenseInfo = body.license_info;
    if (body.transmission !== undefined) updateData.transmission = body.transmission;
    if (body.plate_number !== undefined) updateData.plateNumber = body.plate_number;
    if (body.color !== undefined) updateData.color = body.color || null;
    if (body.fuel_type !== undefined) updateData.fuelType = body.fuel_type || null;
    if (body.additional_info !== undefined) updateData.additionalInfo = body.additional_info || null;
    if (body.seller_name !== undefined) updateData.sellerName = body.seller_name;
    if (body.seller_phone !== undefined) updateData.sellerPhone = body.seller_phone;
    if (body.seller_residence !== undefined) updateData.sellerResidence = body.seller_residence;

    if (body.listing_price !== undefined) {
      const priceInt = parseIntOrNull(body.listing_price);
      if (isNaN(priceInt) || priceInt < 0) {
        return res.status(400).json({ success: false, message: 'سعر العرض يجب أن يكون رقم صحيح', error_code: 'VALIDATION_ERROR' });
      }
      updateData.listingPrice = priceInt;
    }

    if (body.odometer !== undefined) {
      const odoInt = parseIntOrNull(body.odometer);
      if (isNaN(odoInt) || odoInt < 0) {
        return res.status(400).json({ success: false, message: 'قراءة العداد يجب أن تكون رقم صحيح', error_code: 'VALIDATION_ERROR' });
      }
      updateData.odometer = odoInt;
    }

    // New images (appended to existing)
    if (files.images?.length) {
      const existing = Array.isArray(car.images) ? car.images : [];
      const newUrls = files.images.map((f) => fileUrl(req, f));
      const maxImages = getSetting('max_car_images') ?? 10;
      if (existing.length + newUrls.length > maxImages) {
        return res.status(400).json({
          success: false,
          message: `الحد الأقصى لعدد الصور هو ${maxImages}`,
          error_code: 'TOO_MANY_IMAGES',
        });
      }
      updateData.images = [...existing, ...newUrls];
    }

    if (files.inspection_image?.[0]) {
      updateData.inspectionImageUrl = fileUrl(req, files.inspection_image[0]);
    }
    if (files.seller_license_front?.[0]) {
      updateData.sellerLicenseFront = fileUrl(req, files.seller_license_front[0]);
    }
    if (files.seller_license_back?.[0]) {
      updateData.sellerLicenseBack = fileUrl(req, files.seller_license_back[0]);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد بيانات للتحديث', error_code: 'VALIDATION_ERROR' });
    }

    const oldSnap = { carType: car.carType, model: car.model, listingPrice: car.listingPrice };
    const updated = await updateCar(car.id, updateData);

    await logAudit({
      entityType: 'car',
      entityId: car.id,
      action: 'update',
      oldValue: oldSnap,
      newValue: updateData,
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    const phoneWarning = updateData.sellerPhone && !looksLikeEgyptianMobile(updateData.sellerPhone)
      ? 'رقم الهاتف ممكن يكون غلط — راجعه'
      : null;

    return res.json({
      success: true,
      data: updated,
      ...(phoneWarning && { warning: phoneWarning }),
    });
  } catch (err) {
    next(err);
  }
}

export async function changeCarStatus(req, res, next) {
  try {
    const car = await findCarByIdFull(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }

    const { status: toStatus } = req.body ?? {};
    if (!toStatus) {
      return res.status(400).json({ success: false, message: 'الحالة الجديدة مطلوبة', error_code: 'VALIDATION_ERROR' });
    }

    const error = validateTransition(car.status, toStatus, req.user.roleName);
    if (error) {
      return res.status(422).json({ success: false, message: error, error_code: 'INVALID_TRANSITION' });
    }

    const oldStatus = car.status;
    const updated = await updateCarStatus(car.id, toStatus);

    await logAudit({
      entityType: 'car',
      entityId: car.id,
      action: 'status_change',
      oldValue: { status: oldStatus },
      newValue: { status: toStatus },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function removeCar(req, res, next) {
  try {
    const car = await findCarByIdFull(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'العربية مش موجودة', error_code: 'NOT_FOUND' });
    }

    // Block delete when deposit_paid
    if (car.status === 'deposit_paid') {
      return res.status(422).json({
        success: false,
        message: 'لا يمكن حذف عربية عليها عربون — غيّر الحالة أولاً',
        error_code: 'CANNOT_DELETE_DEPOSIT',
      });
    }

    // Employee delete setting check
    if (req.user.roleName === ROLE_NAMES.EMPLOYEE) {
      const canDelete = getSetting('employee_can_delete_car');
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'حذف العربية غير مفعّل للموظفين حالياً',
          error_code: 'FORBIDDEN',
        });
      }
    }

    await logAudit({
      entityType: 'car',
      entityId: car.id,
      action: 'delete',
      oldValue: { carType: car.carType, model: car.model, status: car.status },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    await deleteCar(car.id);

    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
