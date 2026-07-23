# ── Stage 1: Production dependencies ─────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
# node:22-bookworm-slim (not alpine) — required for Sharp which links against glibc
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN groupadd --gid 1001 nodejs \
 && useradd --uid 1001 --gid 1001 --no-create-home linkora

# Copy production node_modules from deps stage
COPY --from=deps    --chown=linkora:nodejs /app/node_modules    ./node_modules

# Copy compiled server and client bundles
COPY --from=builder --chown=linkora:nodejs /app/dist            ./dist

# Copy PM2 config and package.json (needed for pm2-runtime)
COPY --from=builder --chown=linkora:nodejs /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder --chown=linkora:nodejs /app/package.json    ./package.json

# Create writable runtime directories
RUN mkdir -p logs uploads && chown linkora:nodejs logs uploads

USER linkora

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["npx", "pm2-runtime", "ecosystem.config.cjs", "--env", "production"]
