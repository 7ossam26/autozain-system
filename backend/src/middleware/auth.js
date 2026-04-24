import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAMES } from '../config/constants.js';

export function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح — يرجى تسجيل الدخول',
      error_code: 'UNAUTHORIZED',
    });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'الجلسة انتهت — يرجى تسجيل الدخول مجدداً',
      error_code: 'TOKEN_EXPIRED',
    });
  }
}
