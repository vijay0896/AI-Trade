/**
 * @file app.js
 * @description Express Application entry point configuring security middlewares, routing, and error handling.
 */

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

const corsMiddleware = require('./src/config/cors');
const mainApiRoutes = require('./src/routes/index');
const healthCheckRoutes = require('./src/modules/health/health.routes');
const errorHandler = require('./src/core/middlewares/error');
const requestIdMiddleware = require('./src/core/middlewares/requestId');
const xssMiddleware = require('./src/core/middlewares/xss');
const logger = require('./src/config/logger');

const app = express();

// Trust reverse proxy
app.set('trust proxy', 1);

// 1. Core Request Tracking Middleware (MUST BE FIRST)
app.use(requestIdMiddleware);

// 2. Security Middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(compression());

// 3. Parser & Logger Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Input Sanitization
app.use(xssMiddleware);

// Morgan request logging with Winston
morgan.token('id', (req) => (req.id ? req.id.split('-')[0] : 'req'));
app.use(
  morgan('[:id] :method :url :status :response-time ms - :res[content-length]', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

// 5. Health Check Routes
app.use('/api/health', healthCheckRoutes);
app.use('/health', healthCheckRoutes);

// 6. Master API Routes (v1)
app.use('/api/v1', mainApiRoutes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'AI Trading System Backend API',
    status: 'ACTIVE',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      groww: '/api/v1/groww'
    }
  });
});

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Endpoint [${req.method} ${req.originalUrl}] not found.`
  });
});

// 8. Global Centralized Error Handler (MUST BE LAST)
app.use(errorHandler);

module.exports = app;

