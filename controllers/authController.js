import bcrypt from 'bcryptjs';
import * as authService from '../services/authService.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { authConfig } from '../config/auth.js';
import { logActivity } from '../middleware/logger.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const admin = await authService.findAdminByEmail(email);
    if (!admin) {
      await logActivity(null, 'FAILED_LOGIN', `Failed login attempt: non-existent email "${email}"`, req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if account is active
    if (admin.is_active === false) {
      await logActivity(admin.id, 'FAILED_LOGIN', `Failed login attempt: inactive account "${email}"`, req);
      return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      await logActivity(null, 'FAILED_LOGIN', `Failed login attempt: incorrect password for email "${email}"`, req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await authService.saveRefreshToken(admin.id, refreshToken, expiresAt);
    await authService.updateLastLogin(admin.id);

    // Set secure tokens in cookies
    res.cookie('access_token', accessToken, authConfig.accessCookieOptions);
    res.cookie('refresh_token', refreshToken, authConfig.cookieOptions);

    await logActivity(admin.id, 'LOGIN', 'Admin authenticated successfully', req);

    res.json({
      message: 'Authentication successful',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  // Always return the same generic response, whether or not the account
  // exists, to avoid leaking which emails are registered admins.
  const genericResponse = {
    message: 'If an account exists for this email address, a password reset link has been sent.',
  };
  try {
    if (!email || !EMAIL_RE.test(email)) {
      return res.json(genericResponse);
    }

    const admin = await authService.findAdminByEmail(email);
    if (admin && admin.is_active !== false) {
      const rawToken = await authService.createPasswordResetToken(admin.id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/team-login/reset-password?token=${rawToken}`;

      const result = await sendPasswordResetEmail(admin.email, resetUrl);
      await logActivity(admin.id, 'FORGOT_PASSWORD', `Password reset requested (email ${result.sent ? 'sent' : 'NOT sent — SMTP not configured'})`, req);
    }

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const resetRecord = await authService.findValidResetToken(token);
    if (!resetRecord) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const admin = await authService.findAdminById(resetRecord.admin_id);
    if (!admin) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await authService.updateAdminPassword(admin.id, hashedNewPassword);
    await authService.markResetTokenUsed(resetRecord.id);
    // Invalidate all existing sessions so a leaked old token can't be used after reset.
    await authService.clearAllAdminRefreshTokens(admin.id);

    await logActivity(admin.id, 'RESET_PASSWORD', 'Password reset via forgot-password flow', req);

    res.json({ message: 'Your password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  const refreshToken = req.cookies?.refresh_token;
  try {
    if (refreshToken) {
      await authService.deleteStoredRefreshToken(refreshToken);
    }

    if (req.admin?.id) {
      await logActivity(req.admin.id, 'LOGOUT', 'Admin signed out', req);
    }

    res.clearCookie('access_token', authConfig.accessCookieOptions);
    res.clearCookie('refresh_token', authConfig.cookieOptions);
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const admin = await authService.findAdminById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }
    res.json({ admin });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  const token = req.cookies?.refresh_token;
  try {
    if (!token) {
      return res.status(401).json({ error: 'Refresh token not found.' });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const storedToken = await authService.getStoredRefreshToken(token);
    if (!storedToken) {
      return res.status(401).json({ error: 'Refresh token has been revoked.' });
    }

    const admin = await authService.findAdminById(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: 'Admin account no longer exists.' });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(admin);
    const newRefreshToken = generateRefreshToken(admin);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Delete old refresh token, save new
    await authService.deleteStoredRefreshToken(token);
    await authService.saveRefreshToken(admin.id, newRefreshToken, expiresAt);

    // Reset cookies
    res.cookie('access_token', newAccessToken, authConfig.accessCookieOptions);
    res.cookie('refresh_token', newRefreshToken, authConfig.cookieOptions);

    res.json({ message: 'Tokens rotated successfully' });
  } catch (err) {
    next(err);
  }
};

export const listAdmins = async (req, res, next) => {
  try {
    const admins = await authService.getAllAdmins();
    res.json(admins);
  } catch (err) {
    next(err);
  }
};

export const addAdmin = async (req, res, next) => {
  const { username, email, password, role } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const existingEmail = await authService.findAdminByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'An admin with this email already exists.' });
    }

    const newAdmin = await authService.createAdmin(username, email, password, role || 'admin');
    await logActivity(req.admin.id, 'ADD_ADMIN', `Created new admin account: ${email}`, req);

    res.status(201).json({
      message: 'Admin account created successfully',
      admin: newAdmin,
    });
  } catch (err) {
    next(err);
  }
};

export const removeAdmin = async (req, res, next) => {
  const { id } = req.params;
  try {
    const targetId = parseInt(id, 10);
    if (targetId === req.admin.id) {
      return res.status(400).json({ error: 'You cannot remove your own administrator account.' });
    }

    const deleted = await authService.deleteAdmin(targetId);
    if (!deleted) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    await logActivity(req.admin.id, 'REMOVE_ADMIN', `Soft-deleted admin ID: ${targetId}`, req);
    res.json({ message: 'Admin account deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    // Since verifyToken sets req.admin to access token payload, query fresh from DB
    const admin = await authService.findAdminByEmail(req.admin.email);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await authService.updateAdminPassword(admin.id, hashedNewPassword);

    await logActivity(admin.id, 'CHANGE_PASSWORD', 'Admin updated password successfully', req);

    // Revoke old refresh tokens
    await authService.clearAllAdminRefreshTokens(admin.id);

    // Generate new access/refresh tokens
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authService.saveRefreshToken(admin.id, refreshToken, expiresAt);

    // Reset cookies
    res.cookie('access_token', accessToken, authConfig.accessCookieOptions);
    res.cookie('refresh_token', refreshToken, authConfig.cookieOptions);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
