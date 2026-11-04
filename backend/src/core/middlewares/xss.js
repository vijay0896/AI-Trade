/**
 * @file xss.js
 * @description XSS sanitization middleware for request bodies, query params, and route params.
 */

const xss = require('xss');

const cleanInput = (data) => {
  if (!data) return data;
  if (typeof data === 'string') {
    return xss(data);
  }
  if (Array.isArray(data)) {
    return data.map(cleanInput);
  }
  if (typeof data === 'object') {
    const cleaned = {};
    for (const key of Object.keys(data)) {
      cleaned[key] = cleanInput(data[key]);
    }
    return cleaned;
  }
  return data;
};

const xssMiddleware = (req, _res, next) => {
  if (req.body) req.body = cleanInput(req.body);
  if (req.query) req.query = cleanInput(req.query);
  if (req.params) req.params = cleanInput(req.params);
  next();
};

module.exports = xssMiddleware;

