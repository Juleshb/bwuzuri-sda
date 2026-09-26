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
REV="$(git rev-parse --short HEAD)"
printf '{"revision":"%s"}\n' "$REV" > apps/api/dist/build-info.json

set -a
# shellcheck disable=SC1091
source .env
set +a
PORT="${PORT:-8080}"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet bwuzuri-api; then
  systemctl restart bwuzuri-api
else
  echo "Stopping the API process so it loads the new build"
  for pid in $(pgrep -f "/apps/api/dist/index.js" || true); do
    if [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
      kill "$pid" || true
    fi
  done
  sleep 2
  if ! pgrep -f "/apps/api/dist/index.js" >/dev/null 2>&1; then
    echo "Starting the API"
    nohup npm -w @bwuzuri/api start >> "$ROOT/server/api.log" 2>&1 &
    sleep 2
  fi
fi

echo
echo "Git revision $REV"
curl -fsS "http://127.0.0.1:${PORT}/health/live" || true
echo
echo "The live line must include \"revision\":\"$REV\". If it does not, restart the Node project in the panel."
