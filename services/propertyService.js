import { getDb } from '../config/db.js';
import { slugify, parseCleanArray, mysqlNow } from '../utils/helpers.js';

const now = () => mysqlNow();

const formatRow = (r) => {
  if (!r) return null;
  const images = parseCleanArray(r.images);
  const heroImage = images.length > 0 ? images[0] : (r.hero_image || r.heroImage || null);
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
    images: images.length > 0 ? images : (heroImage ? [heroImage] : []),
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

  let galleryArray = parseCleanArray(data.images || data.gallery);

  if (data.heroImage && !galleryArray.includes(data.heroImage)) {
    galleryArray.unshift(data.heroImage);
  }

  const cleanAmenities = parseCleanArray(data.features || data.amenities);

  const result = await db.run(
    `INSERT INTO properties (name, location, area, price, price_label, type, status, description, features,
      images, floor_plan, brochure, bhk, sq_ft, featured, publish_status, seo_title, seo_description, video_url, tagline, story,
      land_area, virtual_tour_link, coordinates, nearby, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      data.location || '',
      data.area || '',
      data.price ? Number(data.price) : 0,
      data.priceLabel || data.price_label || data.priceDisplay || '',
      type,
      data.status || 'Ongoing',
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

  let galleryArray = parseCleanArray(data.images || data.gallery || existing.images);

  if (data.heroImage && !galleryArray.includes(data.heroImage)) {
    galleryArray.unshift(data.heroImage);
  }

  const cleanAmenities = parseCleanArray(data.features || data.amenities || existing.features);

  await db.run(
    `UPDATE properties SET
      name = ?, location = ?, area = ?, price = ?, price_label = ?, type = ?, status = ?,
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
      data.description ?? existing.description,
      JSON.stringify(cleanAmenities),
      JSON.stringify(galleryArray),
      data.floorPlan || data.floor_plan || existing.floor_plan,
      data.brochure || data.brochurePdf || existing.brochure,
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
