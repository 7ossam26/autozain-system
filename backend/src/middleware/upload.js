import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ALLOWED_IMAGE_MIMES } from '../config/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Ensure uploads dir exists at startup
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function diskStorage(subdir) {
  const dest = path.join(UPLOADS_DIR, subdir);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, unique);
    },
  });
}

function imageFilter(req, file, cb) {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
  // Use cb(null, false) instead of cb(err) to avoid destroying the multipart
  // stream mid-transfer (which causes ECONNRESET). Track the rejection so the
  // controller/error handler can still return a proper 400.
  req.rejectedFiles = req.rejectedFiles || [];
  req.rejectedFiles.push(file.originalname);
  cb(null, false);
}

// Car images (field name: "images", multiple)
export const carImagesUpload = multer({
  storage: diskStorage('cars'),
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: imageFilter,
});

// Inspection report (field name: "inspection_image", single)
export const inspectionUpload = multer({
  storage: diskStorage('inspections'),
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: imageFilter,
});

// Seller license front + back (fields: "seller_license_front", "seller_license_back")
export const licenseUpload = multer({
  storage: diskStorage('licenses'),
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: imageFilter,
});

// Combined upload for car creation: images[] + inspection_image + seller_license_front + seller_license_back
const _carCreateMulter = multer({
  storage: diskStorage('cars'),
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: imageFilter,
}).fields([
  { name: 'images', maxCount: 20 },
  { name: 'inspection_image', maxCount: 1 },
  { name: 'seller_license_front', maxCount: 1 },
  { name: 'seller_license_back', maxCount: 1 },
]);

// Wrap in a standard Express middleware so multer errors (e.g. LIMIT_FILE_SIZE)
// are forwarded to next(err) instead of being thrown, preventing ECONNRESET.
export function carCreateUpload(req, res, next) {
  _carCreateMulter(req, res, (err) => {
    if (err) return next(err);
    // If any files were silently rejected by imageFilter, surface as a 400
    if (req.rejectedFiles && req.rejectedFiles.length > 0) {
      const rejection = new Error('نوع الصورة غير مدعوم — JPEG, PNG, أو WebP فقط');
      rejection.code = 'INVALID_FILE_TYPE';
      return next(rejection);
    }
    next();
  });
}

export function buildFileUrl(req, subpath) {
  const base = env.backendUrl;
  return `${base}/uploads/${subpath}`;
}
