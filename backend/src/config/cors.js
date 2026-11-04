/**
 * @file cors.js
 * @description Configures CORS middleware based on allowed origins.
 */

const cors = require('cors');
const env = require('./env');

const allowedOrigins = env.ALLOWED_ORIGINS;

const corsOptions = {
  origin(origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
};

module.exports = cors(corsOptions);

