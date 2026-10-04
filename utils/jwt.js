import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';

export const generateAccessToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email, username: admin.username, role: admin.role },
    authConfig.accessSecret,
    { expiresIn: authConfig.accessTokenExpiry }
  );
};

export const generateRefreshToken = (admin) => {
  return jwt.sign(
    { id: admin.id },
    authConfig.refreshSecret,
    { expiresIn: authConfig.refreshTokenExpiry }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, authConfig.accessSecret);
  } catch (err) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, authConfig.refreshSecret);
  } catch (err) {
    return null;
  }
};
