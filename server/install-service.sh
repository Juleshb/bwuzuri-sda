#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(id -u)" -ne 0 ]; then
  echo "Run: sudo bash server/install-service.sh" >&2
  exit 1
fi
if [ ! -f "$ROOT/server/bwuzuri-api.service" ]; then
  echo "Run bash server/setup.sh first." >&2
  exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo "This server has no systemd. Use: bash server/start.sh" >&2
  exit 1
fi
cp "$ROOT/server/bwuzuri-api.service" /etc/systemd/system/bwuzuri-api.service
systemctl daemon-reload
systemctl enable --now bwuzuri-api
systemctl --no-pager --full status bwuzuri-api
