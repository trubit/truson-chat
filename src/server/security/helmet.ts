import type { HelmetOptions } from 'helmet';
import { getEnv } from '../config/env.js';

// --------------------------------------------------------------------------
// Helmet configuration
//
// CSP is disabled here — it is enforced by nginx in production.
// crossOriginEmbedderPolicy is disabled to allow embedding third-party media.
// --------------------------------------------------------------------------

export function buildHelmetOptions(): HelmetOptions {
  const { NODE_ENV } = getEnv();
  const isProd = NODE_ENV === 'production';

  return {
    // CSP handled by nginx
    contentSecurityPolicy: false,

    // Allow embedding third-party media (e.g., Cloudinary, YouTube)
    crossOriginEmbedderPolicy: false,

    // Strict-Transport-Security: only in production
    strictTransportSecurity: isProd
      ? {
          maxAge: 31_536_000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // Prevent MIME sniffing
    noSniff: true,

    // Prevent clickjacking
    frameguard: { action: 'deny' },

    // Block IE from executing downloads in the site context
    ieNoOpen: true,

    // Disable X-Powered-By (Express also has app.disable('x-powered-by'))
    hidePoweredBy: true,

    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // DNS prefetch control
    dnsPrefetchControl: { allow: false },

    // Permissions policy
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },

    // Cross-origin resource policy
    crossOriginResourcePolicy: { policy: isProd ? 'same-site' : 'cross-origin' },

    // Cross-origin opener policy
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

    // X-XSS-Protection (legacy, but still useful for older browsers)
    xssFilter: true,
  };
}

export const helmetOptions: HelmetOptions = buildHelmetOptions();
