#!/bin/sh
set -e

if [ $# -eq 0 ]; then
  echo "Usage: psql.sh <psql arguments>"
  exit 1
fi

exec docker compose --env-file "${ENV_FILE:-.env}" exec postgres psql -U "${ENV_VEMPAIN_SITE_DB_USER:-vempain}" -d "${ENV_VEMPAIN_SITE_DB_NAME:-vempain}" "$@"
