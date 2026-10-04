import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. MYSQL CONFIGURATION (Supports both local and cloud MySQL)
// ---------------------------------------------------------------------------
const rawHost = process.env.DB_HOST || '';
const rawDbUrl = process.env.DATABASE_URL || '';

// ---------------------------------------------------------------------------
// 2. SSL CONFIGURATION (Defaulting to SSL enabled for Cloud MySQL / Aiven)
// ---------------------------------------------------------------------------
const isSslDisabled = process.env.DB_SSL === 'false';
let sslOptions = undefined;

if (!isSslDisabled) {
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  let caContent = undefined;

  if (process.env.DB_SSL_CA && process.env.DB_SSL_CA.trim()) {
    const caVal = process.env.DB_SSL_CA.trim();
    if (caVal.includes('-----BEGIN CERTIFICATE-----')) {
      caContent = caVal;
    } else {
      const candidates = [
        caVal,
        path.resolve(caVal),
        path.resolve(process.cwd(), caVal),
        path.resolve(__dirname, '..', caVal)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          caContent = fs.readFileSync(cand, 'utf8');
          break;
        }
      }
    }
  }

  if (!caContent) {
    const fallbackPaths = [
      path.resolve(process.cwd(), 'ca.pem'),
      path.resolve(__dirname, '../ca.pem'),
      path.resolve(__dirname, '../../ca.pem'),
      path.resolve(process.cwd(), 'certs/ca.pem'),
      path.resolve(__dirname, '../certs/ca.pem')
    ];
    for (const filePath of fallbackPaths) {
      if (fs.existsSync(filePath)) {
        caContent = fs.readFileSync(filePath, 'utf8');
        break;
      }
    }
  }

  sslOptions = {
    rejectUnauthorized,
    ...(caContent ? { ca: caContent } : {})
  };
}

// ---------------------------------------------------------------------------
// 3. POOL CONFIGURATION
// ---------------------------------------------------------------------------
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

let poolConfig = null;

if (rawDbUrl) {
  try {
    const parsedUrl = new URL(rawDbUrl);
    poolConfig = {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port) || 3306,
      database: parsedUrl.pathname.replace(/^\//, ''),
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      ...(sslOptions ? { ssl: sslOptions } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      connectTimeout: 10000,
      multipleStatements: true,
    };
  } catch {
    poolConfig = rawDbUrl;
  }
} else if (dbHost && dbName && dbUser) {
  poolConfig = {
    host: dbHost,
    port: dbPort || 3306,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    connectTimeout: 10000,
    multipleStatements: true,
    ...(sslOptions ? { ssl: sslOptions } : {}),
  };
}

let pool = null;

export const db = {
  get type() {
    return 'mysql';
  },

  query: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return { rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  },

  get: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  },

  all: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  run: async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length, changes: result.length, lastID: null };
    }
    return {
      rows: [],
      rowCount: result.affectedRows,
      changes: result.affectedRows,
      lastID: result.insertId || null,
    };
  },

  exec: async (sql) => {
    const cleanSql = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const statements = cleanSql
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
  },
};

export const getDb = async () => db;
export const getPool = () => pool;

const createTables = async () => {
  const schemaPath = path.join(__dirname, '../../lokah-database/schema.sql');
  const fallbackSchemaPath = path.join(__dirname, '../database/schema.sql');
  const activeSchemaPath = fs.existsSync(schemaPath) ? schemaPath : fallbackSchemaPath;

  if (fs.existsSync(activeSchemaPath)) {
    const schemaSql = fs.readFileSync(activeSchemaPath, 'utf8');
    await db.exec(schemaSql);
  }
};

const runMigrations = async () => {
  try {
    // 1. Ensure stored_media table exists for persistent in-database media storage
    await db.exec(`
      CREATE TABLE IF NOT EXISTS stored_media (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          original_name VARCHAR(255),
          mime_type VARCHAR(100),
          file_data LONGBLOB NOT NULL,
          size INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Backfill any local files from public/uploads to MySQL stored_media if not already present
    try {
      const rootDir = path.resolve();
      const subfolders = ['properties', 'blogs', 'brochures', 'resumes'];
      for (const sub of subfolders) {
        const folderPath = path.join(rootDir, 'public', 'uploads', sub);
        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
              const ext = path.extname(file).toLowerCase();
              let mime = 'image/jpeg';
              if (ext === '.png') mime = 'image/png';
              else if (ext === '.webp') mime = 'image/webp';
              else if (ext === '.pdf') mime = 'application/pdf';

              const buffer = fs.readFileSync(filePath);
              const pool = getPool();
              if (pool) {
                await pool.query(
                  `INSERT IGNORE INTO stored_media (filename, original_name, mime_type, file_data, size)
                   VALUES (?, ?, ?, ?, ?)`,
                  [file, file, mime, buffer, buffer.length]
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Media backfill check info:', e.message);
    }

    // 2. Check if hero_image column exists on properties table
    const columns = await db.all("SHOW COLUMNS FROM properties LIKE 'hero_image'");
    if (!columns || columns.length === 0) {
      console.log('🔄 Migrating database: Adding hero_image column to properties table...');
      await db.run("ALTER TABLE properties ADD COLUMN hero_image TEXT NULL AFTER status");
      console.log('✅ Added hero_image column to properties table.');
    }

    // Always ensure existing properties have hero_image populated and removed from images array
    try {
      const rows = await db.all("SELECT id, hero_image, images FROM properties");
      for (const row of rows) {
        let imgs = [];
        if (row.images) {
          try {
            imgs = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
            if (!Array.isArray(imgs)) imgs = [];
          } catch (e) {
            imgs = [];
          }
        }

        let hero = row.hero_image && row.hero_image.trim() ? row.hero_image.trim() : null;
        let needsUpdate = false;

        if (!hero && imgs.length > 0 && imgs[0]) {
          hero = imgs[0];
          needsUpdate = true;
        }

        // Clean hero out of images array
        if (hero) {
          const normHero = hero.includes('/uploads/') ? hero.substring(hero.indexOf('/uploads/')) : hero;
          const cleaned = imgs.filter(img => {
            const normImg = typeof img === 'string' && img.includes('/uploads/') ? img.substring(img.indexOf('/uploads/')) : img;
            return normImg !== normHero;
          });
          if (cleaned.length !== imgs.length) {
            imgs = cleaned;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await db.run("UPDATE properties SET hero_image = ?, images = ? WHERE id = ?", [hero, JSON.stringify(imgs), row.id]);
        }
      }
      console.log('✅ Sanitized and backfilled hero_image and gallery for all properties.');
    } catch (e) {
      console.warn('⚠️ Property migration backfill info:', e.message);
    }

    // Clean up any lingering sample/demo blogs so only admin-created blogs exist
    try {
      await db.run(`
        DELETE FROM blogs 
        WHERE slug IN ('structural-durability-in-coastal-real-estate', 'timeless-luxury-book-matched-marble-aesthetics')
           OR title IN ('Structural Durability in Coastal Real Estate', 'Timeless Luxury: Book-Matched Marble Aesthetics')
      `);
    } catch (e) {
      console.warn('⚠️ Sample blog cleanup info:', e.message);
    }
  } catch (err) {
    console.warn('⚠️ Migration check info:', err.message);
  }
};

const seedAdmin = async () => {
  const existing = await db.get('SELECT id FROM admins LIMIT 1');
  if (!existing) {
    const email = process.env.ADMIN_EMAIL || 'admin@lokahbuilders.com';
    const name = process.env.ADMIN_NAME || 'Administrator';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO admins (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [name, email, hash, 'admin']
    );
    console.log(`✅ Initial cloud admin account created: ${email}`);
  } else {
    console.log(`ℹ️ Admin account already exists in cloud database. Preserving existing credentials.`);
  }
};

export const testConnection = async () => {
  if (!poolConfig) {
    console.error('❌ MySQL database configuration missing or invalid.');
    return false;
  }

  try {
    pool = mysql.createPool(poolConfig);
    const conn = await pool.getConnection();
    conn.release();
    const targetHost = typeof poolConfig === 'object' ? poolConfig.host : 'Cloud MySQL';
    const targetPort = typeof poolConfig === 'object' ? poolConfig.port : '';
    console.log(`✅ Connected to Cloud MySQL database server at ${targetHost}${targetPort ? ':' + targetPort : ''} (SSL Encrypted).`);

    await createTables();
    await runMigrations();
    await seedAdmin();
    console.log(`✅ Cloud MySQL database ready and online.`);
    return true;
  } catch (err) {
    const targetHost = typeof poolConfig === 'object' ? poolConfig.host : 'Cloud MySQL';
    console.error(`❌ Cloud MySQL connection failed to ${targetHost}: ${err.message}`);
    console.error(`❌ Connection refusal: Check remote DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_SSL configuration.`);
    return false;
  }
};
