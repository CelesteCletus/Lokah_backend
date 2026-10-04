import bcrypt from 'bcryptjs';
import { getPool } from '../config/db.js';
import { slugify } from '../utils/helpers.js';

export const runSeeders = async () => {
  console.log('🌱 Seeding database...');
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Seed Admin
    const [adminRows] = await conn.query('SELECT * FROM admins LIMIT 1');
    if (adminRows.length === 0) {
      console.log('  Seeding default admin...');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@lokahbuilders.com';
      const adminName = process.env.ADMIN_NAME || 'Administrator';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await conn.query(
        `INSERT INTO admins (email, name, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, true)`,
        [adminEmail, adminName, passwordHash, 'admin']
      );
    } else {
      console.log('  Admin already exists. Skipping...');
    }

    // 2. Properties (managed via admin dashboard, no dummy seed)

    // 3. Blogs (managed via admin dashboard, no dummy seed)

    await conn.commit();
    console.log('🌱 Database seeding completed.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Database seeding failed:', err.message);
    throw err;
  } finally {
    conn.release();
  }
};
