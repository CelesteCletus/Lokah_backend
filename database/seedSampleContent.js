import { getDb } from '../config/db.js';

// Mirrors src/data/sampleData.ts (properties) and src/lib/db.ts (initialBlogs)
// so a freshly deployed backend shows the same demo content as the static
// fallback the frontend already ships with, instead of an empty database.

const sampleProperties = [];

const sampleBlogs = [
  {
    title: 'Structural Durability in Coastal Real Estate',
    category: 'Engineering',
    author: 'Lead Engineer',
    excerpt: 'Analyzing material selection and moisture-barrier specification for premium coastal developments in Kerala.',
    image: '/images/blog/blog-1.jpg',
    featured: true,
    content: '### Technical Analysis on Coastal Building Durability\n\nBuilding near the sea in Kerala poses severe structural challenges...',
  },
  {
    title: 'Timeless Luxury: Book-Matched Marble Aesthetics',
    category: 'Design',
    author: 'Interior Architect',
    excerpt: 'How careful selection and layout of natural Italian marble veins establish premium home atmospheres.',
    image: '/images/services/interior-exterior.jpg',
    featured: false,
    content: '### Designing with Natural Italian Marble\n\nBook-matching is the practice...',
  },
];

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const seedSampleContentIfEmpty = async () => {
  const db = await getDb();

  const propRow = await db.get('SELECT COUNT(*) as count FROM properties');
  if (propRow.count === 0) {
    console.log('  Seeding demo properties...');
    for (const p of sampleProperties) {
      await db.run(
        `INSERT INTO properties (name, location, area, price, price_label, type, status, description,
          features, images, bhk, sq_ft, featured, publish_status, seo_title, seo_description, tagline, story, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          p.name, p.location, p.area, p.price, p.priceDisplay, p.type, p.status, p.description,
          JSON.stringify(p.amenities), JSON.stringify(p.images), p.bhk, p.sqft,
          p.featured ? 1 : 0, 'published', p.name, p.description.substring(0, 150), '', ''
        ]
      );
    }
  }

  const blogRow = await db.get('SELECT COUNT(*) as count FROM blogs');
  if (blogRow.count === 0) {
    console.log('  Seeding demo blog posts...');
    for (const b of sampleBlogs) {
      await db.run(
        `INSERT INTO blogs (title, slug, category, content, author, image, publish_status, seo_title,
          seo_description, featured, gallery_images, excerpt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          b.title, slugify(b.title), b.category, b.content, b.author, b.image,
          'published', b.title, b.excerpt, b.featured ? 1 : 0, JSON.stringify([]), b.excerpt
        ]
      );
    }
  }

  console.log('✅ Demo content ready.');
};
