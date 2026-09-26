#!/bin/bash
# Copyright (c) 2025-2026 Abderaouf Bouzerara
# SPDX-License-Identifier: AGPL-3.0-only
set -e

if [ "$GF_SECURITY_ADMIN_USER" = "admin" ] || [ "$GF_SECURITY_ADMIN_PASSWORD" = "admin" ]; then
  echo "ERROR: Insecure Grafana credentials detected!"
  echo "Default 'admin' user/password is not allowed in this project."
  echo "Please set GRAFANA_ADMIN_USER and GRAFANA_ADMIN_PASSWORD in your .env file."
  exit 1
fi

exec /run.sh "$@"
