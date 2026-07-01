import morgan from 'morgan';
import type { RequestHandler } from 'express';
import { httpLogger } from '../logger/index.js';
import { getEnv } from '../config/env.js';

const format = getEnv().NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestLogger: RequestHandler = morgan(format, {
  // httpLogger exposes a write() method that forwards to Winston at http level
  stream: httpLogger,
  // Suppress health-check noise in log output
  skip: (req) => req.url === '/health',
});
