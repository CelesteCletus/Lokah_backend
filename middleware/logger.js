import morgan from 'morgan';
import { logActivity as writeLog } from '../services/logService.js';

// Express Morgan logger for console requests
export const requestLogger = morgan('dev');

// Audit logger for recording administrative actions in the database
export const logActivity = async (adminIdOrObj, action, details, req = null) => {
  try {
    let rawIp = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    if (Array.isArray(rawIp)) rawIp = rawIp[0];
    if (typeof rawIp === 'string' && rawIp.includes(',')) rawIp = rawIp.split(',')[0];
    rawIp = String(rawIp).trim();

    let ipAddress = rawIp;
    if (!rawIp || rawIp === '::1' || rawIp === '::ffff:127.0.0.1' || rawIp === '127.0.0.1') {
      ipAddress = '127.0.0.1 (Localhost)';
    } else {
      ipAddress = rawIp.replace(/^::ffff:/, '');
    }

    const adminEmail = req?.admin?.email || (typeof adminIdOrObj === 'object' ? adminIdOrObj?.email : null) || null;
    await writeLog(adminEmail, action, details, ipAddress);
  } catch (err) {
    console.warn('Failed to log admin activity:', err.message);
  }
};
