import * as propertyService from '../services/propertyService.js';
import { logActivity } from '../middleware/logger.js';

export const getProperties = async (req, res, next) => {
  const { category, featured } = req.query;
  try {
    const filters = {};
    if (category) filters.category = category;
    if (featured !== undefined) filters.featured = featured === 'true';

    const properties = await propertyService.getProperties(filters);
    res.json(properties);
  } catch (err) {
    next(err);
  }
};

export const getPropertyById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const property = await propertyService.getPropertyById(parseInt(id, 10));
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    res.json(property);
  } catch (err) {
    next(err);
  }
};

export const createProperty = async (req, res, next) => {
  try {
    const data = { ...req.body };

    // Handle files if uploaded via multipart/form-data
    if (req.files) {
      if (req.files.heroImage && req.files.heroImage[0]) {
        data.heroImage = `/uploads/properties/${req.files.heroImage[0].filename}`;
      }
      if (req.files.gallery) {
        const galleryUrls = req.files.gallery.map(f => `/uploads/properties/${f.filename}`);
        // If data.gallery is sent as string/JSON, combine or override
        data.gallery = galleryUrls;
      }
      if (req.files.brochure && req.files.brochure[0]) {
        data.brochurePdf = `/uploads/properties/${req.files.brochure[0].filename}`;
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        data.floorPlan = `/uploads/properties/${req.files.floorPlan[0].filename}`;
      }
    }

    // Parse array/JSON fields if sent as strings (common in multipart)
    if (typeof data.amenities === 'string') {
      try { data.amenities = JSON.parse(data.amenities); } catch (e) { data.amenities = data.amenities.split(',').map(a => a.trim()); }
    }
    if (typeof data.coordinates === 'string') {
      try { data.coordinates = JSON.parse(data.coordinates); } catch (e) {}
    }
    if (typeof data.nearby === 'string') {
      try { data.nearby = JSON.parse(data.nearby); } catch (e) {}
    }
    if (typeof data.gallery === 'string') {
      try { data.gallery = JSON.parse(data.gallery); } catch (e) { data.gallery = data.gallery.split(',').map(g => g.trim()); }
    }

    const newProperty = await propertyService.createProperty(data);
    await logActivity(req.admin.id, 'CREATE_PROPERTY', `Created property listing: ${newProperty.title} (ID: ${newProperty.id})`, req);

    res.status(201).json(newProperty);
  } catch (err) {
    next(err);
  }
};

export const updateProperty = async (req, res, next) => {
  const { id } = req.params;
  try {
    const data = { ...req.body };
    const propId = parseInt(id, 10);

    // Handle uploaded files
    if (req.files) {
      if (req.files.heroImage && req.files.heroImage[0]) {
        data.heroImage = `/uploads/properties/${req.files.heroImage[0].filename}`;
      }
      if (req.files.gallery) {
        data.gallery = req.files.gallery.map(f => `/uploads/properties/${f.filename}`);
      }
      if (req.files.brochure && req.files.brochure[0]) {
        data.brochurePdf = `/uploads/properties/${req.files.brochure[0].filename}`;
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        data.floorPlan = `/uploads/properties/${req.files.floorPlan[0].filename}`;
      }
    }

    // Parse array/JSON strings if necessary
    if (typeof data.amenities === 'string') {
      try { data.amenities = JSON.parse(data.amenities); } catch (e) { data.amenities = data.amenities.split(',').map(a => a.trim()); }
    }
    if (typeof data.coordinates === 'string') {
      try { data.coordinates = JSON.parse(data.coordinates); } catch (e) {}
    }
    if (typeof data.nearby === 'string') {
      try { data.nearby = JSON.parse(data.nearby); } catch (e) {}
    }
    if (typeof data.gallery === 'string') {
      try { data.gallery = JSON.parse(data.gallery); } catch (e) { data.gallery = data.gallery.split(',').map(g => g.trim()); }
    }

    const updated = await propertyService.updateProperty(propId, data);
    if (!updated) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    await logActivity(req.admin.id, 'UPDATE_PROPERTY', `Updated property listing: ${updated.title} (ID: ${updated.id})`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteProperty = async (req, res, next) => {
  const { id } = req.params;
  try {
    const propId = parseInt(id, 10);
    const deleted = await propertyService.deleteProperty(propId);
    if (!deleted) {
      return res.status(404).json({ error: 'Property not found or already deleted.' });
    }

    await logActivity(req.admin.id, 'DELETE_PROPERTY', `Soft-deleted property ID: ${propId}`, req);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
