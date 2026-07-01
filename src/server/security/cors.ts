import type { CorsOptions } from 'cors';
import { getEnv } from '../config/env.js';

// --------------------------------------------------------------------------
// Allowed origins
// --------------------------------------------------------------------------

function getAllowedOrigins(): string[] {
  const { CLIENT_URL, NODE_ENV } = getEnv();
  const origins = [CLIENT_URL];

  // In development, also allow the default Vite dev server port
  if (NODE_ENV === 'development') {
    origins.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return origins;
}

// --------------------------------------------------------------------------
// CORS options
// --------------------------------------------------------------------------

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 h preflight cache
  optionsSuccessStatus: 204,
};
