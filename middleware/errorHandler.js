export const errorHandler = (err, req, res, next) => {
  console.error('💥 Express Error Caught:');
  console.error(err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? 'An unexpected server error occurred.' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};

// Catch-all 404 handler
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ error: `Not Found: ${req.originalUrl}` });
};
