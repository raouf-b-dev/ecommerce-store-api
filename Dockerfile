# ── Stage 1: build ──────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# bcrypt requires native compilation on Alpine (musl libc)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Strip devDependencies after build
RUN npm prune --production

# ── Stage 2: production ────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

# Tini: proper PID 1 init — forwards SIGTERM to Node.js for graceful shutdown
RUN apk add --no-cache tini

ENV NODE_ENV=production

# Copy only production artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Basic liveness check — update to GET /health after @nestjs/terminus (Phase 8)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/main.js"]
