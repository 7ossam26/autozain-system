import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAMES } from '../config/constants.js';
import { findUserByUsername, findUserById } from '../repositories/userRepository.js';
import { getModuleAccessByRoleId } from '../repositories/moduleAccessRepository.js';

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    ...(env.cookieDomain && { domain: env.cookieDomain }),
    maxAge: maxAgeMs,
  };
}

function issueTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, roleId: user.roleId, roleName: user.role.name },
    env.jwtSecret,
    { expiresIn: env.accessTokenTtl },
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    env.jwtRefreshSecret,
    { expiresIn: env.refreshTokenTtl },
  );
  return { accessToken, refreshToken };
}

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    role: { id: user.roleId, name: user.role.name, displayNameAr: user.role.displayNameAr },
  };
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم وكلمة المرور مطلوبين',
        error_code: 'VALIDATION_ERROR',
      });
    }

    const user = await findUserByUsername(username.trim());

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غلط',
        error_code: 'INVALID_CREDENTIALS',
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غلط',
        error_code: 'INVALID_CREDENTIALS',
      });
    }

    const { accessToken, refreshToken } = issueTokens(user);

    res.cookie(COOKIE_NAMES.ACCESS,   accessToken,  cookieOpts(15 * 60 * 1000));
    res.cookie(COOKIE_NAMES.REFRESH,  refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    return res.json({ success: true, data: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie(COOKIE_NAMES.ACCESS);
  res.clearCookie(COOKIE_NAMES.REFRESH);
  return res.json({ success: true, data: null });
}

export async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود',
        error_code: 'USER_NOT_FOUND',
      });
    }

    const permissions = await getModuleAccessByRoleId(user.roleId);
    return res.json({ success: true, data: { ...formatUser(user), permissions } });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAMES.REFRESH];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم العثور على رمز التحديث',
        error_code: 'NO_REFRESH_TOKEN',
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtRefreshSecret);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'رمز التحديث غير صالح أو منتهي الصلاحية',
        error_code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await findUserById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير نشط',
        error_code: 'USER_NOT_FOUND',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = issueTokens(user);
    res.cookie(COOKIE_NAMES.ACCESS,   accessToken,     cookieOpts(15 * 60 * 1000));
    res.cookie(COOKIE_NAMES.REFRESH,  newRefreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    return res.json({ success: true, data: { refreshed: true } });
  } catch (err) {
    next(err);
  }
}
