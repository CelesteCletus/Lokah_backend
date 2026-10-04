import * as careerService from '../services/careerService.js';
import { logActivity } from '../middleware/logger.js';

/* ============================================================================
   JOBS (CAREER POSTINGS)
   ============================================================================ */
export const getJobs = async (req, res, next) => {
  const { includeClosed } = req.query;
  try {
    const jobs = await careerService.getJobs(includeClosed === 'true');
    res.json(jobs);
  } catch (err) {
    next(err);
  }
};

export const getJobById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const job = await careerService.getJobById(parseInt(id, 10));
    if (!job) return res.status(404).json({ error: 'Job position not found.' });
    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const job = await careerService.createJob(req.body);
    await logActivity(req.admin.id, 'CREATE_JOB', `Created job posting: ${job.title} (ID: ${job.id})`, req);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await careerService.updateJob(parseInt(id, 10), req.body);
    if (!updated) return res.status(404).json({ error: 'Job posting not found.' });

    await logActivity(req.admin.id, 'UPDATE_JOB', `Updated job posting: ${updated.title} (ID: ${updated.id})`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req, res, next) => {
  const { id } = req.params;
  try {
    const deleted = await careerService.deleteJob(parseInt(id, 10));
    if (!deleted) return res.status(404).json({ error: 'Job posting not found.' });

    await logActivity(req.admin.id, 'DELETE_JOB', `Soft-deleted job posting ID: ${id}`, req);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};


/* ============================================================================
   JOB APPLICATIONS
   ============================================================================ */
export const createApplication = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF resume file.' });
    }

    const data = {
      ...req.body,
      resumePath: `/uploads/resumes/${req.file.filename}`,
    };

    if (data.jobId) {
      data.jobId = parseInt(data.jobId, 10);
    }

    const application = await careerService.createApplication(data);
    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
};

export const getApplications = async (req, res, next) => {
  try {
    const applications = await careerService.getApplications();
    res.json(applications);
  } catch (err) {
    next(err);
  }
};
