/**
 * @file server.js
 * @description HTTP Server listener with graceful shutdown and Groww broker auto-initialization.
 */

const env = require('./src/config/env');
const app = require('./app');
const logger = require('./src/config/logger');
const GrowwService = require('./src/modules/groww/groww.service');

const PORT = env.PORT || 5001;

const server = app.listen(PORT, async () => {
  logger.info('====================================================');
  logger.info(`🚀 AI Trading Backend running on port ${PORT}`);
  logger.info(`📊 Mode: ${env.NODE_ENV}`);
  logger.info('====================================================');

  try {
    logger.info('Connecting to Groww Trading API via TOTP authentication...');
    const session = await GrowwService.connect();
    logger.info('✅ Groww connection established at startup:', session);
  } catch (error) {
    logger.warn('⚠️ Could not connect to Groww at startup (can reconnect via API):', {
      error: error.message
    });
  }
});

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = (signal) => {
  logger.warn(`🛑 [${signal}] received. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    logger.error('⚠️ Forcefully terminating server after 5s timeout.');
    process.exit(1);
  }, 5000);
  forceExitTimeout.unref();

  server.close(() => {
    logger.info('✅ HTTP server closed cleanly. In-flight requests finished.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('💥 UNHANDLED REJECTION:', err);
});

