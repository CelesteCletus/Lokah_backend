import { verifyAccessToken } from '../utils/jwt.js';

export const verifyToken = (req, res, next) => {
  // Read token from secure httpOnly cookies (or authorization header fallback)
  let token = req.cookies?.access_token;
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }

  req.admin = decoded;
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Access denied. Administrator session required.' });
  }
  const role = req.admin.role || 'admin';
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Access forbidden. Administrator role required.' });
  }
  next();
};
