import fs from 'fs';
import path from 'path';
import { getPool } from '../config/db.js';

/**
 * Saves an uploaded file buffer directly and permanently into the MySQL database.
 * 
 * @param {Object} param
 * @param {string} param.filename - The unique file name (e.g. uuid.jpg)
 * @param {string} [param.originalName] - Original file name from user upload
 * @param {string} [param.mimeType] - Mime type (e.g. image/jpeg, application/pdf)
 * @param {Buffer} param.buffer - Raw binary file buffer
 * @param {number} [param.size] - File size in bytes
 * @returns {Promise<boolean>}
 */
export const saveMediaToDb = async ({ filename, originalName, mimeType, buffer, size }) => {
  try {
    const pool = getPool();
    if (!pool) return false;
    await pool.query(
      `INSERT INTO stored_media (filename, original_name, mime_type, file_data, size)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE file_data = VALUES(file_data), mime_type = VALUES(mime_type), size = VALUES(size)`,
      [filename, originalName || filename, mimeType || 'application/octet-stream', buffer, size || buffer.length]
    );
    console.log(`💾 Saved "${filename}" permanently into MySQL stored_media (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to save ${filename} to MySQL stored_media:`, err.message);
    return false;
  }
};

/**
 * Retrieves a stored file from the MySQL database by filename.
 * 
 * @param {string} filename 
 * @returns {Promise<{filename: string, mime_type: string, file_data: Buffer}|null>}
 */
export const getMediaFromDb = async (filename) => {
  try {
    const pool = getPool();
    if (!pool) return null;
    const [rows] = await pool.query(
      'SELECT filename, mime_type, file_data FROM stored_media WHERE filename = ? LIMIT 1',
      [filename]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0];
  } catch (err) {
    console.error(`❌ Failed to fetch ${filename} from MySQL stored_media:`, err.message);
    return null;
  }
};

/**
 * Express middleware to serve media files directly from the MySQL database
 * whenever a file is not found on the local container disk.
 */
export const serveMediaFromDb = async (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename || filename === '.' || !filename.includes('.')) {
    return next();
  }

  const media = await getMediaFromDb(filename);
  if (!media || !media.file_data) {
    return next();
  }

  // Set proper caching, content-type, and proof-of-persistence headers
  res.setHeader('Content-Type', media.mime_type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Served-By', 'MySQL-Database');
  res.setHeader('X-Media-Persistence', 'Permanent-MySQL');

  // Re-populate the local container disk cache so subsequent requests in this session are instant
  try {
    const rootDir = path.resolve();
    const fullDiskPath = path.join(rootDir, 'public', 'uploads', req.path.replace(/^\/uploads\/?/, ''));
    const dir = path.dirname(fullDiskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullDiskPath, media.file_data);
  } catch (e) {
    // Non-fatal if disk write fails
  }

  return res.end(media.file_data);
};
