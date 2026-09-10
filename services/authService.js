import { getDb } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { mysqlNow } from '../utils/helpers.js';
import crypto from 'crypto';

const now = () => mysqlNow();

// --- Password reset tokens -------------------------------------------------
// Only a SHA-256 hash of the token is ever stored; the raw token exists only
// in memory long enough to email it, and is single-use + short-lived.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const createPasswordResetToken = async (adminId) => {
  const db = await getDb();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = mysqlNow(new Date(Date.now() + RESET_TOKEN_TTL_MS));
  // Invalidate any previous outstanding tokens for this admin first.
  await db.run(
    'UPDATE password_reset_tokens SET used_at = ? WHERE admin_id = ? AND used_at IS NULL',
    [now(), adminId]
  );
  await db.run(
    'INSERT INTO password_reset_tokens (admin_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [adminId, tokenHash, expiresAt]
  );
  return rawToken;
};

export const findValidResetToken = async (rawToken) => {
  const db = await getDb();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const row = await db.get(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1',
    [tokenHash, now()]
  );
  return row || null;
};

export const markResetTokenUsed = async (id) => {
  const db = await getDb();
  await db.run('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [now(), id]);
};

export const findAdminByEmail = async (email) => {
  const db = await getDb();
  const row = await db.get(
    'SELECT id, email, name, name as username, password_hash, role, is_active, last_login, created_at FROM admins WHERE email = ?',
    [email]
  );
  if (!row) return null;
  return {
    ...row,
    role: row.role || 'admin',
  };
};

export const findAdminById = async (id) => {
  const db = await getDb();
  const row = await db.get(
    'SELECT id, email, name, name as username, role, is_active, last_login, created_at FROM admins WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    role: row.role || 'admin',
  };
};

export const getAllAdmins = async () => {
  const db = await getDb();
  const rows = await db.all('SELECT id, email, name, name as username, role, is_active, last_login, created_at FROM admins ORDER BY id ASC');
  return rows.map((r) => ({
    ...r,
    role: r.role || 'admin',
  }));
};

export const createAdmin = async (username, email, password, role = 'admin') => {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO admins (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, true)',
    [username, email, passwordHash, role]
  );
  const row = await db.get('SELECT id, email, name, name as username, role, is_active, last_login, created_at FROM admins WHERE id = ?', [result.lastID]);
  return {
    ...row,
    role: row?.role || 'admin',
  };
};

export const deleteAdmin = async (id) => {
  const db = await getDb();
  const result = await db.run('UPDATE admins SET is_active = false WHERE id = ?', [id]);
  return result.changes > 0;
};

export const updateLastLogin = async (id) => {
  const db = await getDb();
  await db.run('UPDATE admins SET last_login = ? WHERE id = ?', [now(), id]);
};

export const updateAdminPassword = async (id, passwordHash) => {
  const db = await getDb();
  await db.run('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, id]);
};

// Refresh token store
export const saveRefreshToken = async (adminId, token, expiresAt) => {
  const db = await getDb();
  await db.run(
    'INSERT INTO refresh_tokens (admin_id, token, expires_at) VALUES (?, ?, ?)',
    [adminId, token, expiresAt instanceof Date ? mysqlNow(expiresAt) : expiresAt]
  );
};

export const getStoredRefreshToken = async (token) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
  return row || null;
};

export const deleteStoredRefreshToken = async (token) => {
  const db = await getDb();
  await db.run('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};

export const clearAllAdminRefreshTokens = async (adminId) => {
  const db = await getDb();
  await db.run('DELETE FROM refresh_tokens WHERE admin_id = ?', [adminId]);
};
