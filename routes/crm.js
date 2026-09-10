import express from 'express';
import * as crmController from '../controllers/crmController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimiter.js';
import { uploadBrochures } from '../middleware/upload.js';

const router = express.Router();

// Enquiries
router.post('/enquiries', formLimiter, crmController.createEnquiry);
router.get('/enquiries', verifyToken, isAdmin, crmController.getEnquiries);
router.put('/enquiries/:id', verifyToken, isAdmin, crmController.updateEnquiry);

// Consultations
router.post('/consultations', formLimiter, crmController.createConsultation);
router.get('/consultations', verifyToken, isAdmin, crmController.getConsultations);
router.put('/consultations/:id', verifyToken, isAdmin, crmController.updateConsultation);

// Site Visits
router.post('/site-visits', formLimiter, crmController.createSiteVisit);
router.get('/site-visits', verifyToken, isAdmin, crmController.getSiteVisits);
router.put('/site-visits/:id', verifyToken, isAdmin, crmController.updateSiteVisit);

// Testimonials
router.get('/testimonials', crmController.getTestimonials);
router.post('/testimonials', verifyToken, isAdmin, crmController.createTestimonial);

// Brochure
router.get('/brochure', crmController.getBrochure);
router.post(
  '/brochure',
  verifyToken,
  isAdmin,
  uploadBrochures.single('brochureFile'),
  crmController.uploadBrochure
);

export default router;
