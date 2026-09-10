import { getDb } from '../config/db.js';

// Mirrors src/data/sampleData.ts (properties) and src/lib/db.ts (initialBlogs)
// so a freshly deployed backend shows the same demo content as the static
// fallback the frontend already ships with, instead of an empty database.

const sampleProperties = [
  {
    name: 'The Royal Palm Villa', type: 'Villa', status: 'Completed',
    location: 'Kochi, Kerala', area: 'Kakkanad', price: 18500000, priceDisplay: '₹1.85 Cr',
    bhk: '4 BHK', sqft: 5200,
    image: '/images/projects/completed-1.jpg',
    images: ['/images/projects/completed-1.jpg', '/images/services/interior-exterior.jpg', '/images/hero/home-hero.jpg'],
    amenities: ['Private Pool', 'Smart Home', 'Home Theater', 'Wine Cellar', 'Garden', 'Security', 'Car Garage'],
    description: 'An architectural masterpiece blending modern elegance with traditional charm. This 4 BHK villa features premium Italian marble flooring, a private infinity pool, and panoramic views of the lush green surroundings.',
    featured: true,
  },
  {
    name: 'Azure Heights', type: 'Apartment', status: 'Completed',
    location: 'Trivandrum, Kerala', area: 'Technopark', price: 9500000, priceDisplay: '₹95 Lakhs',
    bhk: '3 BHK', sqft: 2400,
    image: '/images/projects/completed-2.jpg',
    images: ['/images/projects/completed-2.jpg', '/images/services/interior-exterior.jpg', '/images/hero/projects-hero.jpg'],
    amenities: ['Clubhouse', 'Gym', 'Swimming Pool', 'Tennis Court', 'Jogging Track', '24/7 Security', 'Power Backup'],
    description: 'Luxury high-rise living at its finest. Azure Heights offers breathtaking sea views, world-class amenities, and proximity to the IT hub of Trivandrum.',
    featured: true,
  },
  {
    name: 'Golden Horizon Estate', type: 'Villa', status: 'Land to Landmark',
    location: 'Thrissur, Kerala', area: 'Guruvayur Road', price: 4500000, priceDisplay: '₹45 Lakhs',
    bhk: 'NA', sqft: 0,
    image: '/images/services/property-development.jpg',
    images: ['/images/services/property-development.jpg', '/images/hero/services-hero.jpg'],
    amenities: ['Corner Plot', 'Road Frontage', 'Well Water', 'Electricity Connection', 'Boundary Wall'],
    description: 'Prime residential plot in a fast-developing area. Perfect for building your dream home with excellent connectivity to Guruvayur and Thrissur city.',
    featured: true,
  },
  {
    name: 'The Emerald Villa', type: 'Villa', status: 'Completed',
    location: 'Kottayam, Kerala', area: 'Kumarakom', price: 32000000, priceDisplay: '₹3.2 Cr',
    bhk: '5 BHK', sqft: 7500,
    image: '/images/projects/completed-1.jpg',
    images: ['/images/projects/completed-1.jpg', '/images/services/interior-exterior.jpg', '/images/hero/about-hero.jpg'],
    amenities: ['Private Lake Access', 'Infinity Pool', 'Ayurveda Spa', 'Outdoor BBQ', 'Boat Jetty', 'Staff Quarters', 'EV Charging'],
    description: 'A waterfront paradise overlooking the serene Vembanad Lake. This architectural gem features sustainable design, private boat access, and world-class luxury amenities.',
    featured: true,
  },
  {
    name: 'Platinum Towers', type: 'Apartment', status: 'Completed',
    location: 'Calicut, Kerala', area: 'Mavoor Road', price: 7200000, priceDisplay: '₹72 Lakhs',
    bhk: '3 BHK', sqft: 1850,
    image: '/images/projects/completed-2.jpg',
    images: ['/images/projects/completed-2.jpg', '/images/services/interior-exterior.jpg'],
    amenities: ['Rooftop Infinity Pool', 'State-of-art Gym', 'Mini Theater', 'Party Hall', 'Kids Play Area', 'Car Parking'],
    description: 'Contemporary urban living in the heart of Calicut. Premium finishes, smart home features, and stunning city views make this a perfect investment.',
    featured: false,
  },
  {
    name: 'Royal Garden Villa', type: 'Villa', status: 'Completed',
    location: 'Kochi, Kerala', area: 'Panampilly Nagar', price: 15000000, priceDisplay: '₹1.5 Cr',
    bhk: '4 BHK', sqft: 3800,
    image: '/images/projects/completed-1.jpg',
    images: ['/images/projects/completed-1.jpg', '/images/services/interior-exterior.jpg'],
    amenities: ['Landscaped Garden', 'Solar Powered', 'Rainwater Harvesting', 'Modular Kitchen', 'Home Automation', '3 Car Garage'],
    description: "An eco-luxury villa in Kochi's most prestigious neighborhood. Features sustainable design without compromising on opulence.",
    featured: false,
  },
  {
    name: 'Sunrise Valley Plot', type: 'Plot', status: 'Land to Landmark',
    location: 'Alappuzha, Kerala', area: 'Cherthala', price: 2800000, priceDisplay: '₹28 Lakhs',
    bhk: 'NA', sqft: 0,
    image: '/images/services/property-development.jpg',
    images: ['/images/services/property-development.jpg', '/images/hero/services-hero.jpg'],
    amenities: ['Road Access', 'Water Connection', 'Electricity', 'Compound Wall', 'Paved Driveway'],
    description: 'Serene and peaceful residential plot in the backwater region of Alappuzha. Ideal for a vacation home or retreat.',
    featured: false,
  },
  {
    name: 'Infinity Sky Residences', type: 'Apartment', status: 'Ongoing',
    location: 'Kochi, Kerala', area: 'Edappally', price: 12500000, priceDisplay: '₹1.25 Cr',
    bhk: '4 BHK', sqft: 3200,
    image: '/images/projects/ongoing-1.jpg',
    images: ['/images/projects/ongoing-1.jpg', '/images/projects/ongoing-2.jpg'],
    amenities: ['Sky Lounge', 'Helipad Access', 'Concierge Service', 'Private Elevator', 'Smart Home', 'Premium Gym', 'Infinity Pool'],
    description: 'Ultra-premium high-rise residences offering unparalleled luxury. Direct mall access and world-class amenities define this project.',
    featured: true,
  },
];

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
