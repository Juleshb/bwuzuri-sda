#!/usr/bin/env bash
# Prepare the API in whatever folder this project was copied to.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SEED=0
if [ "${1:-}" = "--seed" ]; then SEED=1; fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Install $1, then run this again." >&2
    exit 1
  fi
}
need node
need npm

if [ ! -f .env ]; then
  cp server/env.example .env
  echo "Created .env in $ROOT"
  echo "Edit .env (database password, JWT_SECRET, CORS_ORIGINS, SEED_PASSWORD), then run: bash server/setup.sh --seed"
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DATABASE_URL:-}" ] || [[ "$DATABASE_URL" == *CHOOSE_A_DATABASE_PASSWORD* ]]; then
  echo "Set DATABASE_URL in $ROOT/.env to the PostgreSQL database on this server." >&2
  exit 1
fi
secret="${JWT_SECRET:-}"
if [ "${#secret}" -lt 32 ] || [[ "$secret" == *CHOOSE_A_SECRET* ]]; then
  echo "Set JWT_SECRET in $ROOT/.env to at least 32 characters." >&2
  exit 1
fi

echo "Installing in $ROOT"
npm install
npx prisma generate
npm -w @bwuzuri/api run build
npx prisma migrate deploy
mkdir -p "${BACKUP_DIR:-./backups}"

if [ "$SEED" = 1 ]; then
  npm run db:seed
  echo "First accounts were created. Sign in as intara with SEED_PASSWORD from .env"
fi

NPM="$(command -v npm)"
cat > server/bwuzuri-api.service <<EOF
[Unit]
Description=SYSTEM Y'INTARA YA BWUZURI API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=$ROOT
EnvironmentFile=$ROOT/.env
Environment=NODE_ENV=production
ExecStart=$NPM -w @bwuzuri/api start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

cat > server/nginx-api.conf <<EOF
server {
  listen 80;
  server_name _;
  location /api/ {
    proxy_pass http://127.0.0.1:${PORT:-8080}/api/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
  location /health/ {
    proxy_pass http://127.0.0.1:${PORT:-8080}/health/;
  }
}
EOF

echo
echo "Backend is ready in $ROOT"
echo "Start it now:  bash server/start.sh"
echo "Keep it running after reboot:  sudo bash server/install-service.sh"
echo "Daily backup line for crontab:"
echo "15 2 * * * cd $ROOT && /usr/bin/env bash $ROOT/scripts/backup-postgres.sh >> $ROOT/backups/backup.log 2>&1"
