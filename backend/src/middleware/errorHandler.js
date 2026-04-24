// Centralized error handler. All errors respond with:
//   { success: false, message, error_code }

export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'Not found',
    error_code: 'NOT_FOUND',
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Multer errors (file size, invalid type, field count)
  if (err.name === 'MulterError' || err.code === 'INVALID_FILE_TYPE') {
    const multerMessages = {
      LIMIT_FILE_SIZE: 'حجم الصورة أكبر من الحد المسموح (5 ميجا)',
      LIMIT_FILE_COUNT: 'عدد الصور أكبر من الحد المسموح',
      LIMIT_UNEXPECTED_FILE: 'حقل رفع غير متوقع',
    };
    return res.status(400).json({
      success: false,
      message: multerMessages[err.code] || err.message || 'خطأ في رفع الملف',
      error_code: err.code || 'UPLOAD_ERROR',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errorCode = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message,
    error_code: errorCode,
  });
}
