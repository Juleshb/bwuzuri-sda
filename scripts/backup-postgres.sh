#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"; RETENTION="${BACKUP_RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"; stamp="$(date -u +%Y%m%dT%H%M%SZ)"; file="$BACKUP_DIR/bwuzuri-$stamp.dump"
pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file="$file"
sha256sum "$file" > "$file.sha256"
find "$BACKUP_DIR" -type f \( -name 'bwuzuri-*.dump' -o -name 'bwuzuri-*.dump.sha256' \) -mtime +"$RETENTION" -delete
printf '%s\n' "$file"
