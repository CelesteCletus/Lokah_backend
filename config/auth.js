import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Fallbacks for secrets to make setup easy and persistent across server reloads
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'lokah_builders_jwt_access_secret_2026_dev_key_stable';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lokah_builders_jwt_refresh_secret_2026_dev_key_stable';

// Cookie configuration for cross-site & same-site environments:
// When frontend (e.g. Vercel: https://lokah-frontend-coral.vercel.app) and
// backend (e.g. Render: https://lokah-builders-backend.onrender.com) are on
// different domains (cross-site), browsers strictly require:
//   - SameSite=None
//   - Secure=true (HTTPS)
//   - Partitioned=true (CHIPS support for third-party cookie restrictions)
//   - Path=/
// In local development (HTTP localhost), browsers reject SameSite=None without Secure,
// so development defaults to SameSite=Lax and Secure=false.
const isProduction = process.env.NODE_ENV === 'production';
const rawSameSite = process.env.COOKIE_SAMESITE ? process.env.COOKIE_SAMESITE.toLowerCase().trim() : null;
const configuredSameSite = rawSameSite || (isProduction ? 'none' : 'lax');
const cookieSecure = isProduction || configuredSameSite === 'none';
const cookiePartitioned = isProduction || configuredSameSite === 'none';

export const authConfig = {
  accessSecret: JWT_ACCESS_SECRET,
  refreshSecret: JWT_REFRESH_SECRET,
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',  // 24 hours (matches accessCookieOptions.maxAge below)
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d', // 30 days
  cookieOptions: {
    httpOnly: true,
    secure: cookieSecure, // Only send over HTTPS in production, or always when SameSite=None
    sameSite: configuredSameSite,
    path: '/',
    partitioned: cookiePartitioned,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (aligns with refresh token)
  },
  accessCookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: configuredSameSite,
    path: '/',
    partitioned: cookiePartitioned,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  clearCookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: configuredSameSite,
    path: '/',
    partitioned: cookiePartitioned,
  }
};
