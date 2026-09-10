import { mysqlNow } from '../utils/helpers.js';
import { getDb } from '../config/db.js';

const now = () => mysqlNow();

/* ============================================================================
   CAREERS (JOB POSTINGS)
   ============================================================================ */
export const getJobs = async (includeClosed = false) => {
  const db = await getDb();
  let query = "SELECT * FROM jobs WHERE 1=1";
  if (!includeClosed) query += " AND status = 'open'";
  query += " ORDER BY id DESC";
  const rows = await db.all(query);
  return rows.map(r => ({ ...r, requirements: parseArr(r.requirements) }));
};

export const getJobById = async (id) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM jobs WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, requirements: parseArr(row.requirements) };
};

export const createJob = async (data) => {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO jobs (title, department, location, description, requirements, experience, type, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [
      data.title,
      data.department || null,
      data.location || null,
      data.description,
      JSON.stringify(data.requirements || []),
      data.experience || null,
      data.type,
      now()
    ]
  );
  return getJobById(result.lastID);
};

export const updateJob = async (id, data) => {
  const existing = await getJobById(id);
  if (!existing) return null;
  const db = await getDb();
  await db.run(
    `UPDATE jobs SET title = ?, department = ?, location = ?, description = ?,
      requirements = ?, experience = ?, type = ?, status = ? WHERE id = ?`,
    [
      data.title || existing.title,
      data.department ?? existing.department,
      data.location ?? existing.location,
      data.description || existing.description,
      JSON.stringify(data.requirements || existing.requirements || []),
      data.experience ?? existing.experience,
      data.type || existing.type,
      data.status || existing.status,
      id
    ]
  );
  return getJobById(id);
};

export const deleteJob = async (id) => {
  const db = await getDb();
  const result = await db.run("DELETE FROM jobs WHERE id = ?", [id]);
  return result.changes > 0;
};


/* ============================================================================
   JOB APPLICATIONS
   ============================================================================ */
export const createApplication = async (data) => {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO job_applications (job_id, job_title, name, email, phone, resume_path, position, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [data.jobId || null, data.jobTitle || null, data.name, data.email, data.phone, data.resumePath, data.position, now()]
  );
  return db.get('SELECT * FROM job_applications WHERE id = ?', [result.lastID]);
};

export const getApplications = async () => {
  const db = await getDb();
  return db.all('SELECT * FROM job_applications ORDER BY id DESC');
};

const parseArr = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};
