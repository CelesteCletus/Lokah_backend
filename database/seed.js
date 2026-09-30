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

    // 3. Seed Blogs
    const [blogRows] = await conn.query('SELECT * FROM blogs LIMIT 1');
    if (blogRows.length === 0) {
      console.log('  Seeding sample blogs...');
      const sampleBlogs = [
        {
          title: 'Structural Durability in Coastal Real Estate',
          category: 'Engineering',
          author: 'Lead Engineer',
          image: '/images/blog/blog-1.jpg',
          featured: true,
          content: `### Technical Analysis on Coastal Building Durability\n\nBuilding near the sea in Kerala poses severe structural challenges...`
        },
        {
          title: 'Timeless Luxury: Book-Matched Marble Aesthetics',
          category: 'Design',
          author: 'Interior Architect',
          image: '/images/services/interior-exterior.jpg',
          featured: false,
          content: `### Designing with Natural Italian Marble\n\nBook-matching is the practice of matching two or more marble slabs...`
        }
      ];

      for (const b of sampleBlogs) {
        await conn.query(
          `INSERT INTO blogs
            (title, slug, category, content, author, image, publish_status, seo_title, seo_description, featured)
           VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
          [
            b.title, slugify(b.title), b.category, b.content, b.author, b.image,
            b.title, b.title, b.featured
          ]
        );
      }
    } else {
      console.log('  Blogs already exist. Skipping...');
    }

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
