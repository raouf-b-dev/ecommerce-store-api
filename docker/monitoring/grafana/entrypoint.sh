#!/bin/bash
set -e

if [ "$GF_SECURITY_ADMIN_USER" = "admin" ] || [ "$GF_SECURITY_ADMIN_PASSWORD" = "admin" ]; then
  echo "ERROR: Insecure Grafana credentials detected!"
  echo "Default 'admin' user/password is not allowed in this project."
  echo "Please set GRAFANA_ADMIN_USER and GRAFANA_ADMIN_PASSWORD in your .env file."
  exit 1
fi

exec /run.sh "$@"
