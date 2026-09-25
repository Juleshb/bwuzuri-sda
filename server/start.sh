#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -f .env ]; then
  echo "Missing .env. Run: bash server/setup.sh" >&2
  exit 1
fi
if [ ! -f apps/api/dist/index.js ]; then
  echo "API is not built. Run: bash server/setup.sh" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
export NODE_ENV=production
exec npm -w @bwuzuri/api start
