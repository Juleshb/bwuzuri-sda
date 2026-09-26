#!/usr/bin/env bash
# Pull the latest API, apply database migrations, rebuild, and restart.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Missing .env in $ROOT. Run: bash server/setup.sh" >&2
  exit 1
fi

echo "Updating $ROOT"
git pull --ff-only
npm install
npx prisma generate
npx prisma migrate deploy
npm -w @bwuzuri/api run build

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files bwuzuri-api.service --no-legend >/dev/null 2>&1 && systemctl is-enabled bwuzuri-api >/dev/null 2>&1; then
  systemctl restart bwuzuri-api
  systemctl --no-pager --full status bwuzuri-api
else
  echo
  echo "The new API is built in apps/api/dist."
  echo "Restart the Node project in the panel so it loads that build."
  echo "Working directory must stay: $ROOT"
fi

echo
echo "Now running $(git rev-parse --short HEAD)"
echo "Check: curl -s http://127.0.0.1:\${PORT:-8080}/health/live"
