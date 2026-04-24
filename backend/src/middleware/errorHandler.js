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
