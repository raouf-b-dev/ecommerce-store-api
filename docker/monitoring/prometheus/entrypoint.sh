#!/bin/sh
# Copyright (c) 2025-2026 Abderaouf Bouzerara
# SPDX-License-Identifier: MIT
set -eu

PORT="${PORT:-3000}"
TEMPLATE="/etc/prometheus/prometheus.yml.template"
RENDERED="/tmp/prometheus.yml"

sed "s/__API_HOST_PORT__/${PORT}/g" "$TEMPLATE" > "$RENDERED"

exec /bin/prometheus \
  --config.file="$RENDERED" \
  --storage.tsdb.retention.time=30d \
  --web.enable-lifecycle \
  --web.enable-remote-write-receiver
