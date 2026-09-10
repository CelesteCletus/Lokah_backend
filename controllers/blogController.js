import * as blogService from '../services/blogService.js';
import { logActivity } from '../middleware/logger.js';

export const getBlogs = async (req, res, next) => {
  const { category, publishStatus, featured } = req.query;
  try {
    const filters = {};
    if (category) filters.category = category;
    if (publishStatus) filters.publishStatus = publishStatus;
    if (featured !== undefined) filters.featured = featured === 'true';

    const blogs = await blogService.getBlogs(filters);
    res.json(blogs);
  } catch (err) {
    next(err);
  }
};

export const getBlogById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const blog = await blogService.getBlogById(parseInt(id, 10));
    if (!blog) {
      return res.status(404).json({ error: 'Blog article not found.' });
    }
    res.json(blog);
  } catch (err) {
    next(err);
  }
};

export const createBlog = async (req, res, next) => {
  try {
    const data = { ...req.body };
    
    // Handle files if uploaded via multipart/form-data
    if (req.files) {
      if (req.files.featuredImage && req.files.featuredImage[0]) {
        data.featuredImage = `/uploads/blogs/${req.files.featuredImage[0].filename}`;
      }
      if (req.files.pdfAttachment && req.files.pdfAttachment[0]) {
        data.pdfAttachment = `/uploads/blogs/${req.files.pdfAttachment[0].filename}`;
      }
      if (req.files.gallery) {
        data.gallery = req.files.gallery.map(f => `/uploads/blogs/${f.filename}`);
      }
    }

    if (typeof data.gallery === 'string') {
      try { data.gallery = JSON.parse(data.gallery); } catch (e) { data.gallery = data.gallery.split(',').map(g => g.trim()); }
    }

    const newBlog = await blogService.createBlog(data);
    await logActivity(req.admin.id, 'CREATE_BLOG', `Created blog post: ${newBlog.title} (ID: ${newBlog.id})`, req);
    res.status(201).json(newBlog);
  } catch (err) {
    next(err);
  }
};

export const updateBlog = async (req, res, next) => {
  const { id } = req.params;
  try {
    const data = { ...req.body };
    const blogId = parseInt(id, 10);

    if (req.files) {
      if (req.files.featuredImage && req.files.featuredImage[0]) {
        data.featuredImage = `/uploads/blogs/${req.files.featuredImage[0].filename}`;
      }
      if (req.files.pdfAttachment && req.files.pdfAttachment[0]) {
        data.pdfAttachment = `/uploads/blogs/${req.files.pdfAttachment[0].filename}`;
      }
      if (req.files.gallery) {
        data.gallery = req.files.gallery.map(f => `/uploads/blogs/${f.filename}`);
      }
    }

    if (typeof data.gallery === 'string') {
      try { data.gallery = JSON.parse(data.gallery); } catch (e) { data.gallery = data.gallery.split(',').map(g => g.trim()); }
    }

    const updated = await blogService.updateBlog(blogId, data);
    if (!updated) {
      return res.status(404).json({ error: 'Blog article not found.' });
    }

    await logActivity(req.admin.id, 'UPDATE_BLOG', `Updated blog post: ${updated.title} (ID: ${updated.id})`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteBlog = async (req, res, next) => {
  const { id } = req.params;
  try {
    const blogId = parseInt(id, 10);
    const deleted = await blogService.deleteBlog(blogId);
    if (!deleted) {
      return res.status(404).json({ error: 'Blog article not found or already deleted.' });
    }

    await logActivity(req.admin.id, 'DELETE_BLOG', `Soft-deleted blog ID: ${blogId}`, req);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
