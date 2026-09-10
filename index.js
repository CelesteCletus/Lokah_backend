import './config/validateEnv.js';
import app from './app.js';
import { testConnection } from './config/db.js';
import { seedSampleContentIfEmpty } from './database/seedSampleContent.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Initialize MySQL database (creates tables + seeds admin if needed)
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Database initialization failed. Exiting.');
    process.exit(1);
  }

  // Populate demo properties/blogs on first boot only (no-op if data already exists)
  await seedSampleContentIfEmpty();

  // Start listening
  app.listen(PORT, () => {
    console.log(`🚀 Lokah Builders API running at http://localhost:${PORT}`);
    console.log('✅ MySQL database is ONLINE and ready.');
  });
};

startServer();
