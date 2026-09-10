import { mysqlNow } from '../utils/helpers.js';
import { getDb } from '../config/db.js';

const now = () => mysqlNow();

/* ============================================================================
   ENQUIRIES
   ============================================================================ */
export const createEnquiry = async (data) => {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO enquiries (name, phone, email, message, project_interest, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [data.name, data.phone, data.email, data.message, data.projectInterest, now()]
  );
  return db.get('SELECT * FROM enquiries WHERE id = ?', [result.lastID]);
};

export const getEnquiries = async () => {
  const db = await getDb();
  return db.all('SELECT * FROM enquiries ORDER BY id DESC');
};

export const updateEnquiry = async (id, data) => {
  const db = await getDb();
  const existing = await db.get('SELECT * FROM enquiries WHERE id = ?', [id]);
  if (!existing) return null;
  await db.run(
    'UPDATE enquiries SET status = ?, notes = ? WHERE id = ?',
    [data.status || existing.status, data.notes ?? existing.notes, id]
  );
  return db.get('SELECT * FROM enquiries WHERE id = ?', [id]);
};


/* ============================================================================
   CONSULTATIONS
   ============================================================================ */
export const createConsultation = async (data) => {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO consultations (name, phone, email, preferred_date, project_type, budget, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [data.name, data.phone, data.email, data.preferredDate || null, data.projectType, data.budget || null, data.message || null, now()]
  );
  return db.get('SELECT * FROM consultations WHERE id = ?', [result.lastID]);
};

export const getConsultations = async () => {
  const db = await getDb();
  return db.all('SELECT * FROM consultations ORDER BY id DESC');
};

export const updateConsultation = async (id, data) => {
  const db = await getDb();
  const existing = await db.get('SELECT * FROM consultations WHERE id = ?', [id]);
  if (!existing) return null;
  await db.run(
    'UPDATE consultations SET status = ? WHERE id = ?',
    [data.status || existing.status, id]
  );
  return db.get('SELECT * FROM consultations WHERE id = ?', [id]);
};


/* ============================================================================
   SITE VISITS
   ============================================================================ */
export const createSiteVisit = async (data) => {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO site_visits (name, phone, email, project_id, project_name, visit_date, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
    [data.name, data.phone, data.email, data.projectId || null, data.projectName || null, data.visitDate, data.message || null, now()]
  );
  return db.get('SELECT * FROM site_visits WHERE id = ?', [result.lastID]);
};

export const getSiteVisits = async () => {
  const db = await getDb();
  return db.all('SELECT * FROM site_visits ORDER BY id DESC');
};

export const updateSiteVisit = async (id, data) => {
  const db = await getDb();
  const existing = await db.get('SELECT * FROM site_visits WHERE id = ?', [id]);
  if (!existing) return null;
  await db.run(
    'UPDATE site_visits SET status = ? WHERE id = ?',
    [data.status || existing.status, id]
  );
  return db.get('SELECT * FROM site_visits WHERE id = ?', [id]);
};


/* ============================================================================
   BROCHURES
   ============================================================================ */
export const getLatestBrochure = async () => {
  const db = await getDb();
  return db.get('SELECT * FROM brochure ORDER BY id DESC LIMIT 1');
};

export const createOrUpdateBrochure = async (filePath) => {
  const db = await getDb();
  const latest = await getLatestBrochure();
  if (latest) {
    await db.run('UPDATE brochure SET file_path = ?, updated_at = ? WHERE id = ?', [filePath, now(), latest.id]);
    return db.get('SELECT * FROM brochure WHERE id = ?', [latest.id]);
  } else {
    const result = await db.run('INSERT INTO brochure (file_path, updated_at) VALUES (?, ?)', [filePath, now()]);
    return db.get('SELECT * FROM brochure WHERE id = ?', [result.lastID]);
  }
};

export const incrementBrochureDownload = async () => {
  const db = await getDb();
  const latest = await getLatestBrochure();
  if (latest) {
    await db.run('UPDATE brochure SET download_count = download_count + 1 WHERE id = ?', [latest.id]);
  }
};
