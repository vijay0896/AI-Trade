/**
 * @file logger.js
 * @description Winston logger instance with readable development & JSON production formats.
 */

const winston = require('winston');
const env = require('./env');

const { combine, timestamp: formatTimestamp, printf, colorize, json, errors } = winston.format;

const developmentFormat = combine(
  colorize(),
  formatTimestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, requestId, ...metadata }) => {
    let logMsg = `[${timestamp}] ${level}: ${message}`;
    if (requestId) {
      logMsg = `[${requestId.split('-')[0]}] ${logMsg}`;
    }
    const meta = { ...metadata };
    delete meta.service;
    if (Object.keys(meta).length > 0) {
      logMsg += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      logMsg += `\n${stack}`;
    }
    return logMsg;
  })
);

const productionFormat = combine(formatTimestamp(), errors({ stack: true }), json());

const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: env.NODE_ENV === 'development' ? developmentFormat : productionFormat,
  defaultMeta: { service: 'ai-trading-backend' },
  transports: [new winston.transports.Console()]
});

module.exports = logger;

