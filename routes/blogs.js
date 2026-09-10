import express from 'express';
import * as blogController from '../controllers/blogController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { uploadBlogs } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlogById);

// Protected routes (Admin-only)
router.post(
  '/',
  verifyToken,
  isAdmin,
  uploadBlogs.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'pdfAttachment', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  blogController.createBlog
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  uploadBlogs.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'pdfAttachment', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  blogController.updateBlog
);

router.delete('/:id', verifyToken, isAdmin, blogController.deleteBlog);

export default router;
