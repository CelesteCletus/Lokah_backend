import { getDb } from '../config/db.js';
import { getActivityLogs } from '../services/logService.js';

export const getStats = async (req, res, next) => {
  try {
    const db = await getDb();

    const count = async (sql) => {
      const row = await db.get(sql);
      return row ? Object.values(row)[0] : 0;
    };

    const [totalProperties, ongoingProjects, completedProjects, pendingEnquiriesCount, pendingConsultationsCount, pendingSiteVisitsCount, blogs] = await Promise.all([
      count("SELECT COUNT(*) FROM properties"),
      count("SELECT COUNT(*) FROM properties WHERE status = 'Ongoing'"),
      count("SELECT COUNT(*) FROM properties WHERE status = 'Completed'"),
      count("SELECT COUNT(*) FROM enquiries WHERE status = 'pending'"),
      count("SELECT COUNT(*) FROM consultations WHERE status = 'pending'"),
      count("SELECT COUNT(*) FROM site_visits WHERE status = 'pending' OR status = 'scheduled'"),
      count("SELECT COUNT(*) FROM blogs"),
    ]);

    const newEnquiries = pendingEnquiriesCount + pendingConsultationsCount + pendingSiteVisitsCount;

    const activityLogs = await getActivityLogs();

    res.json({
      totalProperties,
      ongoingProjects,
      completedProjects,
      newEnquiries,
      consultations: pendingConsultationsCount,
      siteVisits: pendingSiteVisitsCount,
      blogs,
      activityLogs,
    });
  } catch (err) {
    next(err);
  }
};
