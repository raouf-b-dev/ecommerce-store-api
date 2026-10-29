# ── Stage 1: deps ───────────────────────────────────────────────
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS deps
WORKDIR /app

# bcrypt requires native compilation on Alpine (musl libc)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install the npm pinned in package.json devEngines.packageManager (single source
# of truth; no Node image bundles npm 12 yet). npm ci errors on a mismatch.
RUN npm install -g "npm@$(node -p "require('./package.json').devEngines.packageManager.version")"
RUN npm ci --ignore-scripts
# Rebuild only native addons (bcrypt) - skips husky/prepare hooks
RUN npm rebuild bcrypt

# ── Stage 2: build ──────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

# ── Stage 2b: seed (demo data job for ecommerce-platform) ───────
# Full workspace with ts-node; published as ecommerce-store-api-seed.
FROM build AS seed
WORKDIR /app
CMD ["node_modules/.bin/ts-node", "-r", "tsconfig-paths/register", "scripts/seed.ts"]

# ── Stage 3: prod-deps ──────────────────────────────────────────
# Clean install of production-only dependencies in an isolated stage.
# Avoids deprecated `npm prune --production` and guarantees no dev
# artefacts leak into the final image.
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS prod-deps
WORKDIR /app

# bcrypt native addon needs build tools even for a prod-only install
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install the npm pinned in package.json devEngines.packageManager (single source
# of truth; no Node image bundles npm 12 yet). npm ci errors on a mismatch.
RUN npm install -g "npm@$(node -p "require('./package.json').devEngines.packageManager.version")"
RUN npm ci --omit=dev --ignore-scripts
RUN npm rebuild bcrypt

# ── Stage 4: production ────────────────────────────────────────
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS production
WORKDIR /app

# tini: proper PID 1 init - forwards SIGTERM to Node.js for graceful shutdown
RUN apk add --no-cache tini wget

ENV NODE_ENV=production
ENV PORT=3000
# Pre-load OpenTelemetry instrumentation before any application code.
# tracing.ts checks OTEL_TRACING_ENABLED internally, so --require is always safe.
ENV NODE_OPTIONS="--require ./dist/infrastructure/tracing/tracing.js"

# Copy only production artifacts
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# Demo product photos served at /media/demo (resolved from the working directory)
COPY assets/demo-media ./assets/demo-media

# Entrypoint + migration runner (runs pending DB migrations, then starts the app)
COPY docker-entrypoint.sh ./
COPY scripts/docker-migrate.js ./scripts/
COPY scripts/lib/env-bool.js ./scripts/lib/
RUN chmod +x docker-entrypoint.sh

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p logs \
    && chown appuser:appgroup logs
USER appuser

EXPOSE $PORT

# Liveness check - process viability only
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health/liveness || exit 1

ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
