import { getDb } from '../config/db.js';
import { mysqlNow } from '../utils/helpers.js';

export const getActivityLogs = async () => {
  const db = await getDb();
  return db.all('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 200');
};

export const logActivity = async (adminEmail, action, details, ipAddress) => {
  try {
    const db = await getDb();
    await db.run(
      'INSERT INTO activity_logs (admin_email, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)',
      [adminEmail, action, details, ipAddress, mysqlNow()]
    );
  } catch (err) {
    // Non-fatal — don't crash on logging errors
    console.warn('Log write failed:', err.message);
  }
};
