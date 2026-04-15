#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

LOCK_FILE="$ROOT_DIR/.next/dev/lock"
REQUESTED_PORT="${PORT:-3000}"
TARGET_PORT="$REQUESTED_PORT"

if [ -f "$LOCK_FILE" ]; then
  if lsof "$LOCK_FILE" >/dev/null 2>&1; then
    echo "Next dev is already running for this workspace. Reusing the existing instance."
    exit 0
  fi

  echo "Removing stale Next.js lock at $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

if lsof -ti "tcp:$REQUESTED_PORT" >/dev/null 2>&1; then
  echo "Port $REQUESTED_PORT is busy; starting Next.js on any available port."
  TARGET_PORT=0
fi

exec ./node_modules/.bin/next dev --turbopack --port "$TARGET_PORT"
