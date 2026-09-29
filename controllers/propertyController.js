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

const getUploadedFileUrl = (file, folder = 'properties') => {
  if (!file) return null;
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  if (file.secure_url) return file.secure_url;
  if (file.location) return file.location;
  return `/uploads/${folder}/${file.filename}`;
};

export const createProperty = async (req, res, next) => {
  try {
    const data = { ...req.body };

    // Parse array/JSON fields if sent as strings (common in multipart/form-data)
    if (typeof data.amenities === 'string') {
      try { data.amenities = JSON.parse(data.amenities); } catch (e) { data.amenities = data.amenities.split(',').map(a => a.trim()); }
    }
    if (typeof data.features === 'string') {
      try { data.features = JSON.parse(data.features); } catch (e) { data.features = data.features.split(',').map(a => a.trim()); }
    }
    if (typeof data.coordinates === 'string') {
      try { data.coordinates = JSON.parse(data.coordinates); } catch (e) {}
    }
    if (typeof data.nearby === 'string') {
      try { data.nearby = JSON.parse(data.nearby); } catch (e) {}
    }

    // Existing gallery items sent as JSON string or array
    let remoteGallery = [];
    const rawGallery = data.gallery || data.images;
    if (typeof rawGallery === 'string') {
      try { remoteGallery = JSON.parse(rawGallery); } catch (e) { remoteGallery = rawGallery.split(',').map(g => g.trim()); }
    } else if (Array.isArray(rawGallery)) {
      remoteGallery = rawGallery;
    }

    // Handle files if uploaded via multipart/form-data
    if (req.files) {
      if (req.files.heroImage && req.files.heroImage[0]) {
        data.heroImage = getUploadedFileUrl(req.files.heroImage[0], 'properties');
      }
      if (req.files.gallery && req.files.gallery.length > 0) {
        const newUrls = req.files.gallery.map(f => getUploadedFileUrl(f, 'properties')).filter(Boolean);
        data.gallery = Array.from(new Set([...remoteGallery, ...newUrls]));
      } else {
        data.gallery = remoteGallery;
      }
      if (req.files.brochure && req.files.brochure[0]) {
        data.brochurePdf = getUploadedFileUrl(req.files.brochure[0], 'properties');
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        data.floorPlan = getUploadedFileUrl(req.files.floorPlan[0], 'properties');
      }
    } else {
      data.gallery = remoteGallery;
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

    // Parse array/JSON strings if necessary
    if (typeof data.amenities === 'string') {
      try { data.amenities = JSON.parse(data.amenities); } catch (e) { data.amenities = data.amenities.split(',').map(a => a.trim()); }
    }
    if (typeof data.features === 'string') {
      try { data.features = JSON.parse(data.features); } catch (e) { data.features = data.features.split(',').map(a => a.trim()); }
    }
    if (typeof data.coordinates === 'string') {
      try { data.coordinates = JSON.parse(data.coordinates); } catch (e) {}
    }
    if (typeof data.nearby === 'string') {
      try { data.nearby = JSON.parse(data.nearby); } catch (e) {}
    }

    // Existing gallery items sent as JSON string or array
    let remoteGallery = [];
    const rawGallery = data.gallery !== undefined ? data.gallery : data.images;
    if (typeof rawGallery === 'string') {
      try { remoteGallery = JSON.parse(rawGallery); } catch (e) { remoteGallery = rawGallery.split(',').map(g => g.trim()); }
    } else if (Array.isArray(rawGallery)) {
      remoteGallery = rawGallery;
    }

    // Handle uploaded files
    if (req.files) {
      if (req.files.heroImage && req.files.heroImage[0]) {
        data.heroImage = getUploadedFileUrl(req.files.heroImage[0], 'properties');
      }
      if (req.files.gallery && req.files.gallery.length > 0) {
        const newUrls = req.files.gallery.map(f => getUploadedFileUrl(f, 'properties')).filter(Boolean);
        data.gallery = Array.from(new Set([...remoteGallery, ...newUrls]));
      } else if (rawGallery !== undefined) {
        data.gallery = remoteGallery;
      }
      if (req.files.brochure && req.files.brochure[0]) {
        data.brochurePdf = getUploadedFileUrl(req.files.brochure[0], 'properties');
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        data.floorPlan = getUploadedFileUrl(req.files.floorPlan[0], 'properties');
      }
    } else if (rawGallery !== undefined) {
      data.gallery = remoteGallery;
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
