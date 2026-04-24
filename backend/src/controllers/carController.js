import { ROLE_NAMES } from '../config/constants.js';
import { getSetting } from '../config/settingsCache.js';
import { logAudit } from '../utils/auditLogger.js';
import { looksLikeEgyptianMobile } from '../utils/validators.js';
import { validateCarStatusTransition } from '../utils/stateMachine.js';
import ExcelJS from 'exceljs';
import {
  listCars, findCarByIdFull, createCar, updateCar,
  updateCarStatus, deleteCar, getCarAuditLog,
  listArchivedCars, importCars, listAllCars,
} from '../repositories/carRepository.js';
import { prisma } from '../config/db.js';
import { emitToAll, emitToEmployee } from '../socket/index.js';

// Public projection = same fields as consumer site (no seller info).
function publicCarProjection(car) {
  return {
    id: car.id,
    carType: car.carType,
    model: car.model,
    listingPrice: car.listingPrice,
    plateNumber: car.plateNumber,
    transmission: car.transmission,
    fuelType: car.fuelType,
    odometer: car.odometer,
    color: car.color,
    status: car.status,
    images: car.images,
    createdAt: car.createdAt,
  };
}

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

    // Broadcast to public site + dashboard — only if car is available
    if (car.status === 'available') {
      emitToAll('car:added', publicCarProjection(car));
    }

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

    emitToAll('car:updated', publicCarProjection(updated));

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

    const transition = validateCarStatusTransition({
      fromStatus: car.status,
      toStatus,
      roleName: req.user.roleName,
      employeeCanChangeStatus: getSetting('employee_can_change_status') === true,
    });
    if (!transition.ok) {
      return res.status(422).json({ success: false, message: transition.message, error_code: 'INVALID_TRANSITION' });
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

    emitToAll('car:status_changed', {
      carId: car.id, newStatus: toStatus, oldStatus,
    });
    // Car becoming unavailable → remove from public listings
    if (oldStatus === 'available' && toStatus !== 'available') {
      emitToAll('car:removed', { carId: car.id });
    }
    // Car becoming available again → add back
    if (oldStatus !== 'available' && toStatus === 'available') {
      emitToAll('car:added', publicCarProjection(updated));
    }

    // If the employee changing this car has an active session, suggest ending it.
    if (toStatus === 'deposit_paid' || toStatus === 'sold') {
      const active = await prisma.contactRequest.findFirst({
        where: { employeeId: req.user.userId, status: 'accepted' },
        orderBy: { acceptedAt: 'desc' },
      });
      if (active) {
        emitToEmployee(req.user.userId, 'session:suggest_end', {
          requestId: active.id,
          carId: car.id,
          newStatus: toStatus,
        });
      }
    }

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

    emitToAll('car:removed', { carId: car.id });

    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function getArchive(req, res, next) {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { cars, total } = await listArchivedCars({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      search,
      status,
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

// ─── Export ───────────────────────────────────────────────────────────────────

const STATUS_LABELS_AR = {
  available: 'متاحة',
  deposit_paid: 'عربون',
  sold: 'مباعة',
  withdrawn: 'مسحوبة',
};

const TRANSMISSION_LABELS_AR = {
  automatic: 'أوتوماتيك',
  manual: 'عادي',
};

export async function exportCars(req, res, next) {
  try {
    const cars = await listAllCars(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AutoZain';
    const sheet = workbook.addWorksheet('العربيات', { views: [{ rightToLeft: true }] });

    sheet.columns = [
      { header: 'النوع',        key: 'carType',       width: 16 },
      { header: 'الموديل',      key: 'model',         width: 16 },
      { header: 'السعر',        key: 'listingPrice',  width: 14 },
      { header: 'الحالة',       key: 'status',        width: 12 },
      { header: 'النمرة',       key: 'plateNumber',   width: 14 },
      { header: 'العداد (كم)',  key: 'odometer',      width: 14 },
      { header: 'ناقل الحركة', key: 'transmission',  width: 14 },
      { header: 'اللون',        key: 'color',         width: 12 },
      { header: 'نوع الوقود',  key: 'fuelType',      width: 12 },
      { header: 'تاريخ الإضافة', key: 'createdAt',   width: 18 },
    ];

    sheet.getRow(1).font = { bold: true };

    cars.forEach((car) => {
      sheet.addRow({
        carType: car.carType,
        model: car.model,
        listingPrice: car.listingPrice,
        status: STATUS_LABELS_AR[car.status] || car.status,
        plateNumber: car.plateNumber || '',
        odometer: car.odometer,
        transmission: TRANSMISSION_LABELS_AR[car.transmission] || car.transmission,
        color: car.color || '',
        fuelType: car.fuelType || '',
        createdAt: new Date(car.createdAt).toLocaleDateString('ar-EG'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cars.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

const REQUIRED_IMPORT_FIELDS = [
  'car_type', 'model', 'listing_price', 'transmission',
  'plate_number', 'odometer', 'seller_name', 'seller_phone', 'seller_residence',
];

function parseImportInt(val) {
  if (val === undefined || val === null || val === '') return NaN;
  const n = Number(String(val).replace(/,/g, '').trim());
  if (!Number.isInteger(n) || n < 0) return NaN;
  return n;
}

export async function importCarsHandler(req, res, next) {
  try {
    const { rows } = req.body ?? {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للاستيراد',
        error_code: 'VALIDATION_ERROR',
      });
    }

    if (rows.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'الحد الأقصى لعدد الصفوف المستوردة في مرة واحدة هو 500',
        error_code: 'TOO_MANY_ROWS',
      });
    }

    const errors = [];
    const validRows = [];

    rows.forEach((row, idx) => {
      const rowErrors = [];
      const rowNum = idx + 1;

      REQUIRED_IMPORT_FIELDS.forEach((field) => {
        if (!row[field] && row[field] !== 0) rowErrors.push(`${field} مطلوب`);
      });

      if (row.listing_price && isNaN(parseImportInt(row.listing_price))) {
        rowErrors.push(`listing_price يجب أن يكون رقم صحيح بدون كسور (قيمة: ${row.listing_price})`);
      }

      if (row.odometer && isNaN(parseImportInt(row.odometer))) {
        rowErrors.push(`odometer يجب أن يكون رقم صحيح (قيمة: ${row.odometer})`);
      }

      if (row.transmission && !['automatic', 'manual'].includes(row.transmission)) {
        rowErrors.push(`transmission يجب أن يكون "automatic" أو "manual" (قيمة: ${row.transmission})`);
      }

      if (rowErrors.length) {
        errors.push({ row: rowNum, errors: [...new Set(rowErrors)] });
      } else {
        const priceInt = parseImportInt(row.listing_price);
        const odoInt   = parseImportInt(row.odometer);
        validRows.push({
          carType:          String(row.car_type).trim(),
          model:            String(row.model).trim(),
          listingPrice:     priceInt,
          transmission:     row.transmission,
          plateNumber:      String(row.plate_number).trim(),
          odometer:         isNaN(odoInt) ? 0 : odoInt,
          sellerName:       String(row.seller_name).trim(),
          sellerPhone:      String(row.seller_phone).trim(),
          sellerResidence:  String(row.seller_residence).trim(),
          color:            row.color ? String(row.color).trim() : null,
          fuelType:         row.fuel_type || null,
          additionalInfo:   row.additional_info ? String(row.additional_info).trim() : null,
          licenseInfo:      row.license_info ? String(row.license_info).trim() : '',
          images:           [],
          addedBy:          req.user.userId,
        });
      }
    });

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `${errors.length} صف بهم أخطاء`,
        error_code: 'VALIDATION_ERRORS',
        data: { errors },
      });
    }

    const plates = validRows.map((r) => r.plateNumber).filter(Boolean);
    const uniquePlates = new Set(plates);
    if (uniquePlates.size !== plates.length) {
      return res.status(422).json({
        success: false,
        message: 'يوجد نمر مكررة في ملف الاستيراد',
        error_code: 'DUPLICATE_PLATES',
      });
    }

    const result = await importCars(validRows);

    await logAudit({
      entityType: 'car',
      entityId: req.user.userId,
      action: 'import',
      newValue: { count: result.count },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: { imported: result.count },
      message: `تم استيراد ${result.count} عربية بنجاح`,
    });
  } catch (err) {
    next(err);
  }
}
