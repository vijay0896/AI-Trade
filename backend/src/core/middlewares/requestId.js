/**
 * @file requestId.js
 * @description Request correlation ID middleware.
 */

const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const correlationId =
    req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();

  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);
  next();
};

module.exports = requestIdMiddleware;

