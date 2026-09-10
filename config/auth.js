import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Fallbacks for secrets to make setup easy and persistent across server reloads
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'lokah_builders_jwt_access_secret_2026_dev_key_stable';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lokah_builders_jwt_refresh_secret_2026_dev_key_stable';

// Cookie SameSite behavior: 'lax' works for a frontend/backend split on the
// SAME registrable domain (e.g. lokahbuilders.com + api.lokahbuilders.com —
// this is "same-site" even though they're different subdomains/origins).
// If frontend and backend ever end up on genuinely different domains
// (e.g. a platform-assigned default domain that was never pointed at a
// custom domain), cross-site fetch requests need SameSite=None, which
// browsers require to be paired with Secure. Override via COOKIE_SAMESITE
// if your deployment isn't same-site.
const configuredSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
const cookieSecure = process.env.NODE_ENV === 'production' || configuredSameSite === 'none';

export const authConfig = {
  accessSecret: JWT_ACCESS_SECRET,
  refreshSecret: JWT_REFRESH_SECRET,
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',  // 24 hours (matches accessCookieOptions.maxAge below)
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d', // 30 days
  cookieOptions: {
    httpOnly: true,
    secure: cookieSecure, // Only send over HTTPS in production, or always when SameSite=None
    sameSite: configuredSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (aligns with refresh token)
  },
  accessCookieOptions: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: configuredSameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours — was 15 min, which expired mid-edit on long forms (file uploads/compression) and caused "Access denied. No token provided" on save
  }
};
