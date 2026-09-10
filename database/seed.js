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

    // 2. Seed Properties
    const [propertyRows] = await conn.query('SELECT * FROM properties LIMIT 1');
    if (propertyRows.length === 0) {
      console.log('  Seeding sample properties...');
      const sampleProperties = [
        {
          name: 'The Royal Palm Villa', type: 'Villa', status: 'Completed',
          location: 'Kochi, Kerala', area: 'Kakkanad', price: 18500000, priceDisplay: '₹1.85 Cr',
          bhk: '4 BHK', sqft: 5200,
          images: ['/images/projects/completed-1.jpg', '/images/services/interior-exterior.jpg', '/images/hero/home-hero.jpg'],
          amenities: ['Private Pool', 'Smart Home', 'Home Theater', 'Wine Cellar', 'Garden', 'Security', 'Car Garage'],
          description: 'An architectural masterpiece blending modern elegance with traditional charm. This 4 BHK villa features premium Italian marble flooring, a private infinity pool, and panoramic views of the lush green surroundings.',
          featured: true,
        },
        {
          name: 'Azure Heights', type: 'Apartment', status: 'Completed',
          location: 'Trivandrum, Kerala', area: 'Technopark', price: 9500000, priceDisplay: '₹95 Lakhs',
          bhk: '3 BHK', sqft: 2400,
          images: ['/images/projects/completed-2.jpg', '/images/services/interior-exterior.jpg', '/images/hero/projects-hero.jpg'],
          amenities: ['Clubhouse', 'Gym', 'Swimming Pool', 'Tennis Court', 'Jogging Track', '24/7 Security', 'Power Backup'],
          description: 'Luxury high-rise living at its finest. Azure Heights offers breathtaking sea views, world-class amenities, and proximity to the IT hub of Trivandrum.',
          featured: true,
        },
        {
          name: 'Golden Horizon Estate', type: 'Villa', status: 'Land to Landmark',
          location: 'Thrissur, Kerala', area: 'Guruvayur Road', price: 4500000, priceDisplay: '₹45 Lakhs',
          bhk: 'NA', sqft: 0,
          images: ['/images/services/property-development.jpg', '/images/hero/services-hero.jpg'],
          amenities: ['Corner Plot', 'Road Frontage', 'Well Water', 'Electricity Connection', 'Boundary Wall'],
          description: 'Prime residential plot in a fast-developing area. Perfect for building your dream home with excellent connectivity to Guruvayur and Thrissur city.',
          featured: true,
        },
        {
          name: 'The Emerald Villa', type: 'Villa', status: 'Completed',
          location: 'Kottayam, Kerala', area: 'Kumarakom', price: 32000000, priceDisplay: '₹3.2 Cr',
          bhk: '5 BHK', sqft: 7500,
          images: ['/images/projects/completed-1.jpg', '/images/services/interior-exterior.jpg', '/images/hero/about-hero.jpg'],
          amenities: ['Private Lake Access', 'Infinity Pool', 'Ayurveda Spa', 'Outdoor BBQ', 'Boat Jetty', 'Staff Quarters', 'EV Charging'],
          description: 'A waterfront paradise overlooking the serene Vembanad Lake. This architectural gem features sustainable design, private boat access, and world-class luxury amenities.',
          featured: true,
        }
      ];

      for (const p of sampleProperties) {
        await conn.query(
          `INSERT INTO properties (name, location, area, price, price_label, type, status, description,
            features, images, bhk, sq_ft, featured, publish_status, seo_title, seo_description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
          [
            p.name, p.location, p.area, p.price, p.priceDisplay, p.type, p.status, p.description,
            JSON.stringify(p.amenities), JSON.stringify(p.images), p.bhk, p.sqft,
            p.featured, p.name, p.description.substring(0, 150)
          ]
        );
      }
    } else {
      console.log('  Properties already exist. Skipping...');
    }

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
