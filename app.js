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

// Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to let front-end load local images
}));

// Gzip Compression
app.use(compression());

// CORS configuration supporting cookies credentials exchange
// FRONTEND_URL must be set to the real production domain (e.g. https://lokahbuilders.com).
// In production, ONLY that origin is allowed — the localhost dev origin is never included.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
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
