import express from 'express';
import * as careerController from '../controllers/careerController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimiter.js';
import { uploadResumes } from '../middleware/upload.js';

const router = express.Router();

// Career postings
router.get('/jobs', careerController.getJobs);
router.post('/jobs', verifyToken, isAdmin, careerController.createJob);
router.put('/jobs/:id', verifyToken, isAdmin, careerController.updateJob);
router.delete('/jobs/:id', verifyToken, isAdmin, careerController.deleteJob);

// Applications
router.post(
  '/applications',
  formLimiter,
  uploadResumes.single('resume'),
  careerController.createApplication
);
router.get('/applications', verifyToken, isAdmin, careerController.getApplications);

export default router;
