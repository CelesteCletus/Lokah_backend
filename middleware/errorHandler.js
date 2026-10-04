export const errorHandler = (err, req, res, next) => {
  console.error('💥 Express Error Caught:');
  console.error(err.stack || err.message || err);

  let statusCode = err.statusCode || (err.status ? err.status : 500);
  if (err.name === 'MulterError') {
    statusCode = 400;
  }
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? 'An unexpected server error occurred.' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};

// Catch-all 404 handler
export const notFoundHandler = (req, res, next) => {
  // Prevent edge proxies (Cloudflare, GoDaddy Airo) from caching missing /uploads/* responses
  if (req.originalUrl && req.originalUrl.startsWith('/uploads/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  res.status(404).json({ error: `Not Found: ${req.originalUrl}` });
};
