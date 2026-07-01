import winston from 'winston';
import path from 'path';
import { getEnv } from '../config/env.js';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// --------------------------------------------------------------------------
// Formats
// --------------------------------------------------------------------------

const productionFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json(),
);

const developmentFormat = combine(
  errors({ stack: true }),
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} [${level}] ${message}${metaStr}${stackStr}`;
  }),
);

// --------------------------------------------------------------------------
// Transports
// --------------------------------------------------------------------------

function buildTransports(): winston.transport[] {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProd ? productionFormat : developmentFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ];

  if (process.env.LOG_FILE_ENABLED === 'true') {
    const logDir = env.LOG_DIR;

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: productionFormat,
        maxsize: 20 * 1024 * 1024, // 20 MB
        maxFiles: 14,
        tailable: true,
        handleExceptions: true,
        handleRejections: true,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: productionFormat,
        maxsize: 50 * 1024 * 1024, // 50 MB
        maxFiles: 7,
        tailable: true,
      }),
    );
  }

  return transports;
}

// --------------------------------------------------------------------------
// Logger instance
// --------------------------------------------------------------------------

export const logger = winston.createLogger({
  level: getEnv().LOG_LEVEL,
  transports: buildTransports(),
  exitOnError: false,
  silent: process.env['NODE_ENV'] === 'test',
});

// --------------------------------------------------------------------------
// Morgan stream (httpLogger)
// --------------------------------------------------------------------------

export const httpLogger = {
  write: (message: string): void => {
    logger.http(message.trimEnd());
  },
};

export default logger;
