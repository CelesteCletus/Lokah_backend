import { getDb } from '../config/db.js';
import { slugify, parseCleanArray, mysqlNow } from '../utils/helpers.js';

const now = () => mysqlNow();

const normalizeUrlPath = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const idx = trimmed.indexOf('/uploads/');
  return idx !== -1 ? trimmed.substring(idx) : trimmed;
};

const formatRow = (r) => {
  if (!r) return null;
  const allImages = parseCleanArray(r.images);
  // Hero image priority: dedicated r.hero_image, then fallback to first image in allImages, or r.heroImage
  const heroImage = (r.hero_image && typeof r.hero_image === 'string' && r.hero_image.trim())
    ? r.hero_image.trim()
    : (allImages.length > 0 ? allImages[0] : (r.heroImage || null));

  // Gallery: strictly separate from hero image so gallery never duplicates the hero banner
  const normHero = normalizeUrlPath(heroImage);
  const galleryImages = normHero
    ? allImages.filter(img => normalizeUrlPath(img) !== normHero)
    : allImages;

  const cleanFeatures = parseCleanArray(r.features);
  
  return {
    ...r,
    title: r.name || 'Untitled Property',
    name: r.name || 'Untitled Property',
    category: r.type || 'Villa',
    type: r.type || 'Villa',
    price_display: r.price_label || '',
    priceDisplay: r.price_label || '',
    sqft: r.sq_ft || 0,
    built_area: r.sq_ft || 0,
    hero_image: heroImage,
    heroImage: heroImage,
    featured_image: heroImage,
    image: heroImage,
    images: galleryImages,
    gallery: galleryImages,
    floorPlan: r.floor_plan || null,
    floor_plan: r.floor_plan || null,
    brochurePdf: r.brochure || null,
    brochure: r.brochure || null,
    features: cleanFeatures,
    amenities: cleanFeatures,
    tagline: r.tagline || '',
    story: r.story || '',
    landArea: r.land_area || '',
    land_area: r.land_area || '',
    virtualTourLink: r.virtual_tour_link || '',
    virtual_tour_link: r.virtual_tour_link || '',
    coordinates: (() => { try { return r.coordinates ? JSON.parse(r.coordinates) : null; } catch (e) { return null; } })(),
    nearby: (() => { try { return r.nearby ? JSON.parse(r.nearby) : []; } catch (e) { return []; } })(),
  };
};

export const getProperties = async (filters = {}) => {
  const db = await getDb();
  let query = "SELECT * FROM properties WHERE 1=1";
  const params = [];

  if (filters.featured !== undefined) {
    query += " AND featured = ?";
    params.push(filters.featured ? 1 : 0);
  }
  if (filters.publishStatus) {
    query += " AND publish_status = ?";
    params.push(filters.publishStatus);
  }

  query += " ORDER BY id ASC";
  const rows = await db.all(query, params);
  return rows.map(formatRow);
};

export const getPropertyById = async (id) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM properties WHERE id = ?", [id]);
  if (!row) return null;
  return formatRow(row);
};

export const getPropertyBySlug = async (slug) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM properties");
  const match = rows.find(r => slugify(r.name) === slug);
  if (!match) return null;
  return formatRow(match);
};

export const createProperty = async (data) => {
  const db = await getDb();

  const name = data.name || data.title || 'Untitled Property';
  const type = data.type || data.category || 'Villa';

  const heroImage = data.heroImage || data.hero_image || data.image || null;

  // Gallery holds ONLY gallery images (do not inject heroImage into gallery!)
  const existingImages = parseCleanArray(data.images);
  const uploadedGallery = parseCleanArray(data.gallery);
  let galleryArray = Array.from(new Set([...existingImages, ...uploadedGallery]));
  const normHero = normalizeUrlPath(heroImage);
  if (normHero) {
    galleryArray = galleryArray.filter(img => normalizeUrlPath(img) !== normHero);
  }

  const cleanAmenities = parseCleanArray(data.features || data.amenities);

  const result = await db.run(
    `INSERT INTO properties (name, location, area, price, price_label, type, status, hero_image, description, features,
      images, floor_plan, brochure, bhk, sq_ft, featured, publish_status, seo_title, seo_description, video_url, tagline, story,
      land_area, virtual_tour_link, coordinates, nearby, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      data.location || '',
      data.area || '',
      data.price ? Number(data.price) : 0,
      data.priceLabel || data.price_label || data.priceDisplay || '',
      type,
      data.status || 'Ongoing',
      heroImage,
      data.description || '',
      JSON.stringify(cleanAmenities),
      JSON.stringify(galleryArray),
      data.floorPlan || data.floor_plan || null,
      data.brochure || data.brochurePdf || null,
      data.bhk || null,
      data.sqFt || data.sq_ft || data.sqft || null,
      data.featured ? 1 : 0,
      data.publishStatus || data.publish_status || 'published',
      data.seoTitle || data.seo_title || name,
      data.seoDescription || data.seo_description || '',
      data.videoUrl || data.video_url || null,
      data.tagline || '',
      data.story || '',
      data.landArea || data.land_area || '',
      data.virtualTourLink || data.virtual_tour_link || '',
      data.coordinates ? JSON.stringify(data.coordinates) : null,
      data.nearby ? JSON.stringify(data.nearby) : '[]',
      now(), now()
    ]
  );
  return getPropertyById(result.lastID);
};

export const updateProperty = async (id, data) => {
  const existing = await getPropertyById(id);
  if (!existing) return null;
  const db = await getDb();

  const name = data.name || data.title || existing.name;
  const type = data.type || data.category || existing.type;

  // Resolve hero image
  let heroImage = existing.hero_image;
  if (data.heroImage !== undefined) {
    heroImage = data.heroImage || null;
  } else if (data.hero_image !== undefined) {
    heroImage = data.hero_image || null;
  } else if (data.image !== undefined) {
    heroImage = data.image || null;
  }

  // Gallery array
  let galleryArray = [];
  if (data.gallery !== undefined || data.images !== undefined) {
    const existingImages = parseCleanArray(data.images !== undefined ? data.images : []);
    const uploadedGallery = parseCleanArray(data.gallery !== undefined ? data.gallery : []);
    galleryArray = Array.from(new Set([...existingImages, ...uploadedGallery]));
  } else {
    galleryArray = parseCleanArray(existing.images);
  }

  // Exclude hero image from gallery array to prevent contamination
  const normHero = normalizeUrlPath(heroImage);
  if (normHero) {
    galleryArray = galleryArray.filter(img => normalizeUrlPath(img) !== normHero);
  }

  // Floor plan: support explicit clearing if passed as empty string
  let floorPlan = existing.floor_plan;
  if (data.floorPlan !== undefined) {
    floorPlan = data.floorPlan ? data.floorPlan : null;
  } else if (data.floor_plan !== undefined) {
    floorPlan = data.floor_plan ? data.floor_plan : null;
  }

  // Brochure: support explicit clearing if passed as empty string
  let brochure = existing.brochure;
  if (data.brochure !== undefined) {
    brochure = data.brochure ? data.brochure : null;
  } else if (data.brochurePdf !== undefined) {
    brochure = data.brochurePdf ? data.brochurePdf : null;
  }

  const cleanAmenities = parseCleanArray(data.features || data.amenities || existing.features);

  await db.run(
    `UPDATE properties SET
      name = ?, location = ?, area = ?, price = ?, price_label = ?, type = ?, status = ?, hero_image = ?,
      description = ?, features = ?, images = ?, floor_plan = ?, brochure = ?, bhk = ?, sq_ft = ?,
      featured = ?, publish_status = ?, seo_title = ?, seo_description = ?, video_url = ?, tagline = ?, story = ?,
      land_area = ?, virtual_tour_link = ?, coordinates = ?, nearby = ?, updated_at = ?
     WHERE id = ?`,
    [
      name,
      data.location ?? existing.location,
      data.area ?? existing.area,
      data.price ?? existing.price,
      data.priceLabel || data.price_label || data.priceDisplay || existing.price_label,
      type,
      data.status || existing.status,
      heroImage,
      data.description ?? existing.description,
      JSON.stringify(cleanAmenities),
      JSON.stringify(galleryArray),
      floorPlan,
      brochure,
      data.bhk ?? existing.bhk,
      data.sqFt || data.sq_ft || data.sqft || existing.sq_ft,
      (data.featured !== undefined ? data.featured : existing.featured) ? 1 : 0,
      data.publishStatus || data.publish_status || existing.publish_status,
      data.seoTitle || data.seo_title || existing.seo_title,
      data.seoDescription || data.seo_description || existing.seo_description,
      data.videoUrl || data.video_url || existing.video_url,
      data.tagline !== undefined ? data.tagline : (existing.tagline || ''),
      data.story !== undefined ? data.story : (existing.story || ''),
      data.landArea !== undefined ? data.landArea : (data.land_area !== undefined ? data.land_area : existing.landArea),
      data.virtualTourLink !== undefined ? data.virtualTourLink : (data.virtual_tour_link !== undefined ? data.virtual_tour_link : existing.virtualTourLink),
      data.coordinates ? JSON.stringify(data.coordinates) : (existing.coordinates ? JSON.stringify(existing.coordinates) : null),
      data.nearby ? JSON.stringify(data.nearby) : (existing.nearby ? JSON.stringify(existing.nearby) : '[]'),
      now(), id
    ]
  );
  return getPropertyById(id);
};

export const deleteProperty = async (id) => {
  const db = await getDb();
  const result = await db.run("DELETE FROM properties WHERE id = ?", [id]);
  return result.changes > 0;
};
