import express from 'express';
import * as propertyController from '../controllers/propertyController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { uploadProperties } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);

// Protected routes (Admin-only)
router.post(
  '/',
  verifyToken,
  isAdmin,
  uploadProperties.fields([
    { name: 'heroImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'brochure', maxCount: 1 },
    { name: 'floorPlan', maxCount: 1 }
  ]),
  propertyController.createProperty
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  uploadProperties.fields([
    { name: 'heroImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'brochure', maxCount: 1 },
    { name: 'floorPlan', maxCount: 1 }
  ]),
  propertyController.updateProperty
);

router.delete('/:id', verifyToken, isAdmin, propertyController.deleteProperty);

export default router;
