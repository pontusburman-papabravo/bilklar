#!/usr/bin/env bash
# Generate SSH keys for Cursor Cloud Agent and GitHub Actions, and print
# the exact commands to paste as root in the Inleed console.
set -euo pipefail

SSH_DIR="${SSH_DIR:-$HOME/.ssh}"
CURSOR_KEY="${SSH_DIR}/korpasset_cursor_agent"
ACTIONS_KEY="${SSH_DIR}/korpasset_github_actions"
VPS_HOST="${VPS_HOST:-188.66.62.46}"
VPS_USER="${VPS_USER:-deploy}"
REPO="pontusburman-papabravo/korpasset"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [[ ! -f "$CURSOR_KEY" ]]; then
  ssh-keygen -t ed25519 -f "$CURSOR_KEY" -C "cursor-agent-korpasset" -N ""
fi
if [[ ! -f "$ACTIONS_KEY" ]]; then
  ssh-keygen -t ed25519 -f "$ACTIONS_KEY" -C "github-actions-korpasset" -N ""
fi

CURSOR_PUB="$(cat "${CURSOR_KEY}.pub")"
ACTIONS_PUB="$(cat "${ACTIONS_KEY}.pub")"

cat <<EOF
============================================================
Inga nya molnkonton. Två SSH-nycklar + secrets.

Git-repo: https://github.com/${REPO}
VPS: ${VPS_USER}@${VPS_HOST}

----------------------------------------------------------
1. Inleed-konsol som root (klistra in HELA blocket)
----------------------------------------------------------
adduser --disabled-password --gecos "" ${VPS_USER} || true
usermod -aG sudo ${VPS_USER}
mkdir -p /home/${VPS_USER}/.ssh
cat >> /home/${VPS_USER}/.ssh/authorized_keys <<'KEYS'
${CURSOR_PUB}
${ACTIONS_PUB}
KEYS
chown -R ${VPS_USER}:${VPS_USER} /home/${VPS_USER}/.ssh
chmod 700 /home/${VPS_USER}/.ssh
chmod 600 /home/${VPS_USER}/.ssh/authorized_keys
echo '${VPS_USER} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/${VPS_USER}
chmod 440 /etc/sudoers.d/${VPS_USER}

----------------------------------------------------------
2. Cursor Cloud Agents → Secrets (samma environment som korpasset)
----------------------------------------------------------
Namn: VPS_SSH_KEY     (Runtime Secret) = innehållet i ${CURSOR_KEY}
Namn: VPS_HOST        (Environment Variable) = ${VPS_HOST}
Namn: VPS_USER        (Environment Variable) = ${VPS_USER}
Namn: VPS_APP_PATH    (Environment Variable) = /var/www/korpasset

Kopiera den privata nyckeln (kör på din Mac, inte i chatten):
  pbcopy < ${CURSOR_KEY}
  # eller: cat ${CURSOR_KEY}

----------------------------------------------------------
3. GitHub environment vps
   https://github.com/${REPO}/settings/environments
----------------------------------------------------------
gh api -X PUT repos/${REPO}/environments/vps
gh secret set VPS_SSH_KEY --repo ${REPO} -e vps < ${ACTIONS_KEY}
gh variable set VPS_HOST --repo ${REPO} -e vps -b ${VPS_HOST}
gh variable set VPS_USER --repo ${REPO} -e vps -b ${VPS_USER}
gh variable set VPS_APP_PATH --repo ${REPO} -e vps -b /var/www/korpasset
gh variable set VPS_HEALTH_URL --repo ${REPO} -e vps -b http://127.0.0.1:3000/health

----------------------------------------------------------
4. Säg till agenten att SSH fungerar
----------------------------------------------------------
Därefter installerar agenten Docker, Caddy, Postgres och appen
automatiskt med scripts/vps-bootstrap.sh.

Publika nycklar (lägg bara dessa på servern, aldrig de privata):
Cursor:  ${CURSOR_PUB}
Actions: ${ACTIONS_PUB}
============================================================
EOF
