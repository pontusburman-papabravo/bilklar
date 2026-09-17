#!/usr/bin/env bash
# Fast-forward the VPS checkout to a tested SHA and rebuild.
# Must use --project-directory deploy/ so the existing Compose project
# (`deploy`) and volumes (`deploy_postgres_data`) are reused.
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

if [[ ! -f deploy/docker-compose.yml ]]; then
  echo "SHA $DEPLOY_SHA has no deploy/docker-compose.yml — refusing to continue" >&2
  exit 1
fi

COMPOSE=(docker compose --project-directory "$APP_PATH/deploy" -f "$APP_PATH/deploy/docker-compose.yml")
"${COMPOSE[@]}" up -d --build

for _ in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
    echo "Deployed $DEPLOY_SHA"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deploy of $DEPLOY_SHA" >&2
"${COMPOSE[@]}" ps >&2
"${COMPOSE[@]}" logs --tail=80 app >&2
exit 1
