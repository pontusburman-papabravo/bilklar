#!/usr/bin/env bash
# Fast-forward the VPS checkout to a CI-tested SHA and rebuild.
set -euo pipefail

APP_PATH="${VPS_APP_PATH:-/var/www/korpasset}"
cd "$APP_PATH"

if [[ -z "${DEPLOY_SHA:-}" ]]; then
  echo "DEPLOY_SHA is required" >&2
  exit 1
fi
if ! [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid DEPLOY_SHA: $DEPLOY_SHA" >&2
  exit 1
fi

git fetch --depth 1 origin "$DEPLOY_SHA"
git checkout --force "$DEPLOY_SHA"

docker compose -f deploy/docker-compose.yml up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
    echo "Deployed $DEPLOY_SHA"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deploy of $DEPLOY_SHA" >&2
docker compose -f deploy/docker-compose.yml ps >&2
exit 1
