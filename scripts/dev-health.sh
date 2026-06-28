#!/usr/bin/env sh
set -eu

server_status=$(curl -sS -m 5 -o /tmp/mbta_server_health.json -w "%{http_code}" http://127.0.0.1:3000/health || true)
rollout_status=$(curl -sS -m 5 -o /tmp/mbta_rollout_health.json -w "%{http_code}" "http://127.0.0.1:5173/api/rollout?client_id=dev-health" || true)

ok=1

if [ "$server_status" = "200" ]; then
  echo "server health: up (200)"
else
  echo "server health: down ($server_status)"
  ok=0
fi

if [ "$rollout_status" = "200" ]; then
  echo "web proxy rollout: up (200)"
else
  echo "web proxy rollout: down ($rollout_status)"
  ok=0
fi

for p in 3000 5173 8080; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo "port $p: listening"
  else
    echo "port $p: not-listening"
    ok=0
  fi
done

if [ "$ok" -eq 1 ]; then
  echo "dev health: OK"
else
  echo "dev health: FAILED"
  exit 1
fi
