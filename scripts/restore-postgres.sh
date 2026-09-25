#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"; file="${1:?Usage: restore-postgres.sh BACKUP.dump}"
[ -f "$file" ] || { echo 'Backup file not found' >&2; exit 2; }
if [ -f "$file.sha256" ]; then (cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256"); fi
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$file"
echo 'Restore completed. Run application validation before reopening production writes.'
