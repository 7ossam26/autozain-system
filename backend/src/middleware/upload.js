// Multer upload middleware — scaffold. Configured in Phase 2.

import multer from 'multer';
import { env } from '../config/env.js';
import { ALLOWED_IMAGE_MIMES } from '../config/constants.js';

export const imageUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: env.uploadMaxBytes },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('نوع الصورة غير مدعوم'));
  },
});
