import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);

  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Classify CORS errors as 403 Forbidden
  if (err.message && err.message.includes('not allowed by CORS')) {
    statusCode = 403;
  }

  // In production, redact raw 500 messages to prevent leaking internal database or filesystem details
  const isProd = process.env.NODE_ENV === 'production';
  const clientMessage = (isProd && statusCode === 500)
    ? 'An unexpected server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    error: {
      message: clientMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
