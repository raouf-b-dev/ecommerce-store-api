#!/bin/sh
# docker-entrypoint.sh
# ─────────────────────────────────────────────────────────────────────────────
# Container entrypoint — runs before the main CMD (node dist/main.js).
#
# Responsibilities:
#   1. Run any pending TypeORM migrations via scripts/docker-migrate.js.
#      Uses env vars directly — no ts-node, no compiled data-source.ts needed.
#   2. Hand off to the main process via exec (preserves PID and signal handling).
#
# Signal safety: tini is the real PID 1 (see Dockerfile ENTRYPOINT). This
# script receives SIGTERM from tini and forwards it to the node process via
# exec, enabling graceful shutdown hooks to fire correctly.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "▶ [entrypoint] Running database migrations..."
node scripts/docker-migrate.js

echo "▶ [entrypoint] Migrations complete. Starting E-Commerce API..."
exec "$@"
