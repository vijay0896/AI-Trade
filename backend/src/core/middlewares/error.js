/**
 * @file error.js
 * @description Centralized error-handling middleware.
 */

const env = require('../../config/env');
const logger = require('../../config/logger');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Zod Validation Errors
  if (err.name === 'ZodError' || err.issues) {
    statusCode = 400;
    message = err.issues && err.issues[0] ? err.issues[0].message : 'Validation Error';
    errors = err.issues
      ? err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      : null;
  }

  // Structured logging
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
      requestId: req.id,
      stack: err.stack,
      ip: req.ip
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${message}`, {
      requestId: req.id,
      errors
    });
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

