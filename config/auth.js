import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Fallbacks for secrets to make setup easy and persistent across server reloads
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'lokah_builders_jwt_access_secret_2026_dev_key_stable';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lokah_builders_jwt_refresh_secret_2026_dev_key_stable';

// Cookie configuration for cross-site & same-site environments:
// In cross-site environments (e.g. frontend on xzw5gqcr6f.c35.airoapp.ai and backend on 6qxwqtx3i8.c40.airoapp.ai),
// browsers strictly require:
//   - SameSite=None
//   - Secure=true (HTTPS)
//   - HttpOnly=true
//   - Path=/
//   - Partitioned=true (CHIPS support for third-party cookie restrictions)
const isProduction = process.env.NODE_ENV === 'production';
const rawSameSite = process.env.COOKIE_SAMESITE ? process.env.COOKIE_SAMESITE.toLowerCase().trim() : 'none';
const cookieSameSite = ['none', 'lax', 'strict'].includes(rawSameSite) ? rawSameSite : 'none';
const cookieSecure = cookieSameSite === 'none' || isProduction;
const cookiePartitioned = cookieSameSite === 'none' || isProduction;

export const authConfig = {
  accessSecret: JWT_ACCESS_SECRET,
  refreshSecret: JWT_REFRESH_SECRET,
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',  // 24 hours (matches accessCookieOptions.maxAge below)
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d', // 30 days
  cookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
    partitioned: cookiePartitioned,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (aligns with refresh token)
  },
  accessCookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
    partitioned: cookiePartitioned,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  clearCookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
    partitioned: cookiePartitioned,
  }
};
