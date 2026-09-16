#!/usr/bin/env bash
# Idempotent first-boot of an empty Ubuntu 24 VPS for Körpasset.
# Run as deploy with passwordless sudo, after authorized_keys are in place:
#   curl -fsSL https://raw.githubusercontent.com/pontusburman-papabravo/korpasset/main/scripts/vps-bootstrap.sh | sudo bash
# Until this is merged to main, copy the script to the server and run it.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo bash scripts/vps-bootstrap.sh)" >&2
  exit 1
fi

APP_PATH="${VPS_APP_PATH:-/var/www/korpasset}"
APP_USER="${VPS_USER:-deploy}"
REPO_URL="${REPO_URL:-https://github.com/pontusburman-papabravo/korpasset.git}"
REPO_REF="${REPO_REF:-main}"
DOMAIN="${DOMAIN:-korpasset.se}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git ufw unattended-upgrades \
  gnupg apt-transport-https

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-buildx-plugin
fi

systemctl enable --now docker

id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
usermod -aG docker "$APP_USER"
usermod -aG sudo "$APP_USER"

if [[ ! -f /etc/sudoers.d/$APP_USER ]]; then
  echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$APP_USER"
  chmod 440 "/etc/sudoers.d/$APP_USER"
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null

mkdir -p "$(dirname "$APP_PATH")"
if [[ ! -d "$APP_PATH/.git" ]]; then
  git clone "$REPO_URL" "$APP_PATH"
fi

cd "$APP_PATH"
git fetch origin
if git show-ref --verify --quiet "refs/remotes/origin/${REPO_REF}"; then
  git checkout -B "$REPO_REF" "origin/${REPO_REF}"
else
  git checkout -B main origin/main
fi
chown -R "$APP_USER:$APP_USER" "$APP_PATH"

ENV_FILE="$APP_PATH/deploy/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
APP_BASE_URL=https://${DOMAIN}
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

if [[ ! -f "$APP_PATH/deploy/docker-compose.yml" ]]; then
  echo "deploy/docker-compose.yml missing on ${REPO_REF}. Merge the VPS PR to main, then re-run." >&2
  exit 1
fi

sudo -u "$APP_USER" docker compose --project-directory "$APP_PATH/deploy" \
  -f "$APP_PATH/deploy/docker-compose.yml" up -d --build

echo
echo "Bootstrap complete."
echo "Health locally: curl -fsS http://127.0.0.1:3000/health"
echo "Public:         curl -fsSI https://${DOMAIN}/health"
echo "Secrets live in ${ENV_FILE} (not in git)."
