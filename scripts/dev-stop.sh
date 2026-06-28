#!/usr/bin/env sh
set -eu

PORTS="3000 5173 8080 5174 5175"

for p in $PORTS; do
  pids=$(lsof -nP -tiTCP:$p -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stopping listeners on port $p: $pids"
    kill $pids 2>/dev/null || true
    sleep 1

    remaining=$(lsof -nP -tiTCP:$p -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$remaining" ]; then
      echo "Force stopping listeners on port $p: $remaining"
      kill -9 $remaining 2>/dev/null || true
    fi
  else
    echo "Port $p already clear"
  fi
done
