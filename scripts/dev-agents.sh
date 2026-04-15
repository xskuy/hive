#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR/agents"

REQUESTED_PORT="${PORT:-8000}"
CANDIDATE_PORTS="$REQUESTED_PORT 8002 8003 8004 8005 8006 8007 8008 8009 8010"
OPENAPI_PATH="/openapi.json"
EXPECTED_PATH='"/api/market-sentinel/explain"'

for port in $CANDIDATE_PORTS; do
  if curl -fsS "http://127.0.0.1:${port}${OPENAPI_PATH}" 2>/dev/null | rg -q "$EXPECTED_PATH"; then
    echo "Hive Agents is already running on port $port. Reusing the existing instance."
    exit 0
  fi
done

TARGET_PORT=""
for port in $CANDIDATE_PORTS; do
  if ! lsof -ti "tcp:$port" >/dev/null 2>&1; then
    TARGET_PORT="$port"
    break
  fi
done

if [ -z "$TARGET_PORT" ]; then
  echo "No available port found for Hive Agents in the local discovery range." >&2
  exit 1
fi

if [ "$TARGET_PORT" != "$REQUESTED_PORT" ]; then
  echo "Port $REQUESTED_PORT is busy; starting Hive Agents on port $TARGET_PORT."
fi

exec uv run uvicorn app.main:app --reload --port "$TARGET_PORT"
