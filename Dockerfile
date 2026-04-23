# ── Stage 1: deps ───────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# bcrypt requires native compilation on Alpine (musl libc)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --ignore-scripts
# Rebuild only native addons (bcrypt) — skips husky/prepare hooks
RUN npm rebuild bcrypt

# ── Stage 2: build ──────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

# ── Stage 3: prod-deps ──────────────────────────────────────────
# Clean install of production-only dependencies in an isolated stage.
# Avoids deprecated `npm prune --production` and guarantees no dev
# artefacts leak into the final image.
FROM node:24-alpine AS prod-deps
WORKDIR /app

# bcrypt native addon needs build tools even for a prod-only install
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN npm rebuild bcrypt

# ── Stage 4: production ────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

# tini: proper PID 1 init — forwards SIGTERM to Node.js for graceful shutdown
RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV PORT=3000

# Copy only production artifacts
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Entrypoint + migration runner (runs pending DB migrations, then starts the app)
COPY docker-entrypoint.sh ./
COPY scripts/docker-migrate.js ./scripts/
RUN chmod +x docker-entrypoint.sh

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p logs \
    && chown appuser:appgroup logs
USER appuser

EXPOSE $PORT

# Basic liveness check — update to GET /health after @nestjs/terminus (Phase 8)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
