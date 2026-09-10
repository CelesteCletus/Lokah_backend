import dotenv from 'dotenv';
dotenv.config();

// Production must never silently fall back to hardcoded dev secrets or a
// known default admin password. Development keeps its convenient fallbacks
// (see config/auth.js and database/seedAdmin) since this check is skipped
// unless NODE_ENV=production.
const REQUIRED_IN_PRODUCTION = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET',
  'FRONTEND_URL',
  'ADMIN_PASSWORD',
];

if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key] || !process.env[key].trim());

  if (missing.length > 0) {
    console.error('❌ Cannot start in production: missing required environment variable(s):');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('Set these in your environment before starting the server. Refusing to start with insecure defaults.');
    process.exit(1);
  }
}
