/**
 * PM2 ecosystem configuration for Linkora.
 *
 * Start:   npx pm2 start ecosystem.config.cjs --env production
 * Runtime: npx pm2-runtime ecosystem.config.cjs --env production   (Docker)
 */

'use strict';

module.exports = {
  apps: [
    {
      name: 'linkora-server',

      // Compiled entry point (tsconfig.server.json: rootDir=".", outDir="./dist/server")
      script: 'dist/server/src/server/app.js',

      // ── Clustering ─────────────────────────────────────────────────────────
      instances: 'max',
      exec_mode: 'cluster',

      // ── Startup / shutdown behaviour ───────────────────────────────────────
      // app.ts sends process.send('ready') once the HTTP server is listening
      wait_ready: true,
      listen_timeout: 10_000, // ms to wait for 'ready' signal before SIGKILL
      kill_timeout: 5_000, // ms for graceful SIGTERM before SIGKILL

      // ── Memory limit ───────────────────────────────────────────────────────
      max_memory_restart: '500M',

      // ── Logging ────────────────────────────────────────────────────────────
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Log rotation (pm2-logrotate module) ────────────────────────────────
      // Install once with: npx pm2 install pm2-logrotate
      log_rotate_max_size: '10M',
      log_rotate_retain: 7,
      log_rotate_compress: true,

      // ── Misc ───────────────────────────────────────────────────────────────
      watch: false, // never watch files in production
      autorestart: true,
      exp_backoff_restart_delay: 1000,

      // ── Environment: production ────────────────────────────────────────────
      // Remaining env vars are read from the process environment / .env file.
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
