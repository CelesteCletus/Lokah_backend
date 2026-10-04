import { getDb } from '../config/db.js';
import { slugify, mysqlNow } from '../utils/helpers.js';

const now = () => mysqlNow();

const parseArr = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

export const getBlogs = async (filters = {}) => {
  const db = await getDb();
  let query = "SELECT * FROM blogs WHERE 1=1";
  const params = [];

  if (filters.publishStatus) {
    query += " AND publish_status = ?";
    params.push(filters.publishStatus);
  }
  if (filters.featured !== undefined) {
    query += " AND featured = ?";
    params.push(filters.featured ? 1 : 0);
  }

  query += " ORDER BY id DESC";
  const rows = await db.all(query, params);
  return rows.map(r => ({ ...r, gallery_images: parseArr(r.gallery_images) }));
};

export const getBlogById = async (id) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM blogs WHERE id = ?", [id]);
  if (!row) return null;
  return { ...row, gallery_images: parseArr(row.gallery_images) };
};

export const getBlogBySlug = async (slug) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM blogs WHERE slug = ?", [slug]);
  if (!row) return null;
  return { ...row, gallery_images: parseArr(row.gallery_images) };
};

export const createBlog = async (data) => {
  const db = await getDb();
  const slug = slugify(data.title) + '-' + Date.now().toString().slice(-4);
  const result = await db.run(
    `INSERT INTO blogs (title, slug, category, content, author, image, publish_status, seo_title,
      seo_description, featured, pdf_attachment, gallery_images, excerpt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      slug,
      data.category,
      data.content,
      data.author,
      data.featuredImage || data.image || null,
      data.publishStatus || data.publish_status || 'draft',
      data.seoTitle || data.seo_title || data.title,
      data.seoDescription || data.seo_description || data.excerpt || '',
      data.featured ? 1 : 0,
      data.pdfAttachment || data.pdf_attachment || null,
      JSON.stringify(data.galleryImages || data.gallery || []),
      data.excerpt || null,
      now(), now()
    ]
  );
  return getBlogById(result.lastID);
};

export const updateBlog = async (id, data) => {
  const existing = await getBlogById(id);
  if (!existing) return null;
  const db = await getDb();

  const slug = data.title && data.title !== existing.title
    ? slugify(data.title) + '-' + Date.now().toString().slice(-4)
    : existing.slug;

  await db.run(
    `UPDATE blogs SET title = ?, slug = ?, category = ?, content = ?, author = ?, image = ?,
      publish_status = ?, seo_title = ?, seo_description = ?, featured = ?,
      pdf_attachment = ?, gallery_images = ?, excerpt = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.title || existing.title,
      slug,
      data.category || existing.category,
      data.content || existing.content,
      data.author || existing.author,
      data.featuredImage || data.image || existing.image,
      data.publishStatus || data.publish_status || existing.publish_status,
      data.seoTitle || data.seo_title || existing.seo_title,
      data.seoDescription || data.seo_description || existing.seo_description,
      (data.featured !== undefined ? data.featured : existing.featured) ? 1 : 0,
      data.pdfAttachment || data.pdf_attachment || existing.pdf_attachment,
      JSON.stringify(data.galleryImages || data.gallery || parseArr(existing.gallery_images)),
      data.excerpt ?? existing.excerpt,
      now(), id
    ]
  );
  return getBlogById(id);
};

export const deleteBlog = async (id) => {
  const db = await getDb();
  const result = await db.run("DELETE FROM blogs WHERE id = ?", [id]);
  return result.changes > 0;
};
