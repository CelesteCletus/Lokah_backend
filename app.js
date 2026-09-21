import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import compression from 'compression';

// Import Middlewares
import { requestLogger } from './middleware/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import Routes
import authRouter from './routes/auth.js';
import propertiesRouter from './routes/properties.js';
import blogsRouter from './routes/blogs.js';
import crmRouter from './routes/crm.js';
import careersRouter from './routes/careers.js';
import dashboardRouter from './routes/dashboard.js';
import supportRouter from './routes/support.js';

import { getDb } from './config/db.js';

dotenv.config();

const app = express();

// Trust reverse proxy (essential for Render, Heroku, Cloudflare to detect HTTPS and client IPs correctly)
app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to let front-end load local images
}));

// Gzip Compression
app.use(compression());

// CORS configuration supporting cookies credentials exchange
// Parse CORS_ORIGIN and FRONTEND_URL from environment (comma, whitespace, or semicolon separated)
const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap(str => str.split(/[,\s;]+/))
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const allowedOrigins = Array.from(new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : devOrigins),
]));

// Log allowed origins once at backend startup for deployment confirmation
if (allowedOrigins.length === 0) {
  console.warn('⚠️  [CORS Warning] No allowed origins configured! Set CORS_ORIGIN or FRONTEND_URL in environment.');
} else {
  console.log('🔒 [CORS] Allowed Origins:', allowedOrigins);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server health checks)
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
    const isAllowed = allowedOrigins.some(
      allowed => allowed.trim().replace(/\/+$/, '').toLowerCase() === normalizedOrigin
    );
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true, // Allow JWT HttpOnly secure cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicitly handle preflight for all routes (returns 204 with CORS headers)

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging
app.use(requestLogger);

// Prevent caching for all API endpoints
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Rate Limiter
// Standard rate limiting for most API traffic. The live-support chat routes
// (/api/support/*) are exempted here because they're polled every few
// seconds during a normal conversation — they carry their own dedicated,
// purpose-built limiters instead (see routes/support.js) so chat traffic
// never eats into (or is eaten by) the shared site-wide budget.
app.use('/api/', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/support/')) return next();
  return generalLimiter(req, res, next);
});

// Serve uploads folder statically
const rootDir = path.resolve();
app.use('/uploads', express.static(path.join(rootDir, 'public', 'uploads')));

// Root route — so platform health checks hitting "/" get a 200 instead of a 404
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Lokah Builders API is running' });
});

// Health check endpoint (public, no auth middleware)
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    if (db && typeof db.get === 'function') {
      await db.get('SELECT 1');
      return res.status(200).json({ status: 'ok', database: db.type || 'mysql', message: 'Lokah Builders API is running' });
    }
    return res.status(200).json({ status: 'ok', database: 'ready', message: 'Lokah Builders API is running' });
  } catch (err) {
    return res.status(200).json({ status: 'ok', database: 'connecting', message: 'Lokah Builders API is running' });
  }
});

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/blogs', blogsRouter);
app.use('/api', crmRouter); // enquiries, consultations, site-visits, brochure, testimonials
app.use('/api', careersRouter); // jobs, applications
app.use('/api/dashboard', dashboardRouter); // dashboard stats
app.use('/api/support', supportRouter); // live support chat

// Fallback for static public images if server needs to serve client assets
app.use(express.static(path.join(rootDir, 'public')));

// Error handling routes
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
