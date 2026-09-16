#!/usr/bin/env bash
# SSH to the Körpasset VPS as the Cloud Agent. Requires VPS_SSH_KEY.
set -euo pipefail

HOST="${VPS_HOST:-188.66.62.46}"
USER="${VPS_USER:-deploy}"
PORT="${VPS_SSH_PORT:-22}"
APP_PATH="${VPS_APP_PATH:-/var/www/korpasset}"

if [[ -z "${VPS_SSH_KEY:-}" ]]; then
  echo "VPS_SSH_KEY is not set. Add it as a Cursor runtime secret." >&2
  exit 1
fi

KEY_FILE="$(mktemp)"
cleanup() { rm -f "$KEY_FILE"; }
trap cleanup EXIT
chmod 700 "$(dirname "$KEY_FILE")" 2>/dev/null || true
printf '%s\n' "$VPS_SSH_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

ssh_cmd() {
  ssh -i "$KEY_FILE" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -p "$PORT" \
    "${USER}@${HOST}" \
    "$@"
}

case "${1:-}" in
  ""|-h|--help)
    echo "Usage: $0 check | [remote command...]"
    exit 0
    ;;
  check)
    ssh_cmd "set -euo pipefail; echo host_ok; hostname; test -d '$APP_PATH' && echo app_path_ok; docker compose -f '$APP_PATH/deploy/docker-compose.yml' ps"
    ;;
  *)
    ssh_cmd "$@"
    ;;
esac
