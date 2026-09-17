#!/usr/bin/env bash
# SSH to the Körpasset VPS as the Cloud Agent. Requires VPS_SSH_KEY.
set -euo pipefail

strip_ws() {
  # Trim leading/trailing whitespace and CR from Cursor secret values.
  local value="${1-}"
  value="${value//$'\r'/}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

HOST="$(strip_ws "${VPS_HOST:-188.66.62.46}")"
USER="$(strip_ws "${VPS_USER:-deploy}")"
PORT="$(strip_ws "${VPS_SSH_PORT:-22}")"
APP_PATH="$(strip_ws "${VPS_APP_PATH:-/var/www/korpasset}")"

if [[ -z "${VPS_SSH_KEY:-}" ]]; then
  echo "VPS_SSH_KEY is not set. Add it as a Cursor runtime secret." >&2
  exit 1
fi

# Cursor may flatten VPS_SSH_KEY to one line (spaces instead of PEM
# newlines). Reconstruct OpenSSH PEM; never write the key to git.
write_normalized_key() {
  local dest="$1"
  local raw begin end body
  raw="${VPS_SSH_KEY//$'\r'/}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  raw="${raw//\\n/$'\n'}"

  if [[ "$raw" == *$'\n-----'* ]]; then
    printf '%s' "$raw" > "$dest"
    [[ "$raw" == *$'\n' ]] || printf '\n' >> "$dest"
    return
  fi

  begin="$(printf '%s' "$raw" | sed -n 's/.*\(-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----\).*/\1/p')"
  end="$(printf '%s' "$raw" | sed -n 's/.*\(-----END [A-Z0-9 ]*PRIVATE KEY-----\).*/\1/p')"
  body="$(printf '%s' "$raw" \
    | sed -e 's/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----//' \
          -e 's/-----END [A-Z0-9 ]*PRIVATE KEY-----//' \
    | tr -d '[:space:]')"

  if [[ -z "$begin" || -z "$end" || -z "$body" ]]; then
    echo "VPS_SSH_KEY is not a recognizable OpenSSH PEM key." >&2
    exit 1
  fi

  {
    printf '%s\n' "$begin"
    printf '%s' "$body" | fold -w 70
    printf '\n%s\n' "$end"
  } > "$dest"
}

KEY_FILE="$(mktemp)"
cleanup() { rm -f "$KEY_FILE"; }
trap cleanup EXIT
chmod 700 "$(dirname "$KEY_FILE")" 2>/dev/null || true
write_normalized_key "$KEY_FILE"
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
