/**
 * @file asyncHandler.js
 * @description Wraps async route handlers to pass unhandled errors to Express error handler.
 */

/**
 * Wraps async functions to catch errors and forward to next()
 * @param {Function} fn
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Custom Operational Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  asyncHandler,
  AppError
};

