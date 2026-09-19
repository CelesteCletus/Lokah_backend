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
// Parse FRONTEND_URL cleanly (trim, remove trailing slashes, support comma-separated origins)
const configuredFrontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultProductionOrigins = [
  // Vercel deployment
  'https://lokah-frontend-coral.vercel.app',
  // Custom domain
  'https://lokahbuilders.com',
  'https://www.lokahbuilders.com',
  // GoDaddy Airo — published frontend
  'https://adp691i6fs.c40.airoapp.ai',
  // GoDaddy Airo — preview frontend (used during GoDaddy's internal build preview)
  'https://adp691i6fs.preview.c40.airoapp.ai',
];

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const allowedOrigins = Array.from(new Set([
  ...configuredFrontendUrls,
  ...(process.env.NODE_ENV === 'production' ? defaultProductionOrigins : [...defaultProductionOrigins, ...devOrigins]),
]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true, // Allow JWT HttpOnly secure cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging
app.use(requestLogger);

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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    await db.get('SELECT 1');
    res.json({ status: 'ok', database: db.type, message: 'Lokah Builders API is running' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'offline', message: 'Database unavailable' });
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
