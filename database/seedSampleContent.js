import { getDb } from '../config/db.js';

// Properties and blogs are managed directly via the admin dashboard (no dummy seed)
const sampleProperties = [];
const sampleBlogs = [];

export const seedSampleContentIfEmpty = async () => {
  const db = await getDb();
  // Properties and blogs are managed directly via the admin dashboard (no dummy seed)
  console.log('✅ Content ready (managed via admin dashboard).');
};
