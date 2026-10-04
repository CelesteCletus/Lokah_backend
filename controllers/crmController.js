import * as crmService from '../services/crmService.js';
import { logActivity } from '../middleware/logger.js';

/* ============================================================================
   ENQUIRIES
   ============================================================================ */
export const createEnquiry = async (req, res, next) => {
  try {
    const enquiry = await crmService.createEnquiry(req.body);
    res.status(201).json(enquiry);
  } catch (err) {
    next(err);
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const enquiries = await crmService.getEnquiries();
    res.json(enquiries);
  } catch (err) {
    next(err);
  }
};

export const updateEnquiry = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await crmService.updateEnquiry(parseInt(id, 10), req.body);
    if (!updated) return res.status(404).json({ error: 'Enquiry not found.' });

    await logActivity(req.admin.id, 'UPDATE_ENQUIRY', `Updated Enquiry ID: ${id} status to ${req.body.status}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};


/* ============================================================================
   CONSULTATIONS
   ============================================================================ */
export const createConsultation = async (req, res, next) => {
  try {
    const consultation = await crmService.createConsultation(req.body);
    res.status(201).json(consultation);
  } catch (err) {
    next(err);
  }
};

export const getConsultations = async (req, res, next) => {
  try {
    const consultations = await crmService.getConsultations();
    res.json(consultations);
  } catch (err) {
    next(err);
  }
};

export const updateConsultation = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await crmService.updateConsultation(parseInt(id, 10), req.body);
    if (!updated) return res.status(404).json({ error: 'Consultation request not found.' });

    await logActivity(req.admin.id, 'UPDATE_CONSULTATION', `Updated Consultation ID: ${id} status to ${req.body.status}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};


/* ============================================================================
   SITE VISITS
   ============================================================================ */
export const createSiteVisit = async (req, res, next) => {
  try {
    const siteVisit = await crmService.createSiteVisit(req.body);
    res.status(201).json(siteVisit);
  } catch (err) {
    next(err);
  }
};

export const getSiteVisits = async (req, res, next) => {
  try {
    const siteVisits = await crmService.getSiteVisits();
    res.json(siteVisits);
  } catch (err) {
    next(err);
  }
};

export const updateSiteVisit = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await crmService.updateSiteVisit(parseInt(id, 10), req.body);
    if (!updated) return res.status(404).json({ error: 'Site visit request not found.' });

    await logActivity(req.admin.id, 'UPDATE_SITE_VISIT', `Updated Site Visit ID: ${id} status to ${req.body.status}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};


/* ============================================================================
   TESTIMONIALS
   ============================================================================ */
export const getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await crmService.getTestimonials();
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
};

export const createTestimonial = async (req, res, next) => {
  try {
    const testimonial = await crmService.createTestimonial(req.body);
    await logActivity(req.admin.id, 'CREATE_TESTIMONIAL', `Created client testimonial: ${testimonial.client_name}`, req);
    res.status(201).json(testimonial);
  } catch (err) {
    next(err);
  }
};


/* ============================================================================
   BROCHURES
   ============================================================================ */
export const getBrochure = async (req, res, next) => {
  try {
    const brochure = await crmService.getLatestBrochure();
    if (!brochure) {
      return res.status(404).json({ error: 'No brochure catalog has been uploaded yet.' });
    }
    // Increment download count asynchronously
    await crmService.incrementBrochureDownload();
    res.json(brochure);
  } catch (err) {
    next(err);
  }
};

export const uploadBrochure = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF brochure file.' });
    }

    const filePath = `/uploads/brochures/${req.file.filename}`;
    const brochure = await crmService.createOrUpdateBrochure(filePath);

    await logActivity(req.admin.id, 'UPLOAD_BROCHURE', `Uploaded new catalog PDF: ${filePath}`, req);
    res.status(201).json(brochure);
  } catch (err) {
    next(err);
  }
};
