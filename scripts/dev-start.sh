#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SERVER_LOG=/tmp/mbta_server_dev.log
WEB_LOG=/tmp/mbta_web_dev.log

echo "Cleaning stale listeners"
sh "$ROOT_DIR/scripts/dev-stop.sh"

echo "Starting backend"
(
  cd "$ROOT_DIR/apps/server"
  npm run dev > "$SERVER_LOG" 2>&1
) &

echo "Starting frontend"
(
  cd "$ROOT_DIR/apps/web"
  npm run dev > "$WEB_LOG" 2>&1
) &

echo "Waiting for services"
tries=0
max_tries=20
while [ "$tries" -lt "$max_tries" ]; do
  if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  tries=$((tries + 1))
  sleep 1
done

if ! lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend failed to start on port 3000"
  echo "See log: $SERVER_LOG"
  tail -40 "$SERVER_LOG" 2>/dev/null || true
  exit 1
fi

if ! lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend failed to start on port 5173"
  echo "See log: $WEB_LOG"
  tail -40 "$WEB_LOG" 2>/dev/null || true
  exit 1
fi

echo "Started successfully"
echo "server log: $SERVER_LOG"
echo "web log: $WEB_LOG"

echo "Running smoke checks"
sh "$ROOT_DIR/scripts/dev-health.sh"
