#!/usr/bin/env bash
# Prints the one-liner to run as root on an empty VPS.
# Key generation happens on the server in scripts/vps-bootstrap.sh.
# Do not re-run this on the live Körpasset VPS — it is already bootstrapped.
set -euo pipefail

BRANCH="${BOOTSTRAP_REF:-main}"

cat <<EOF
Logga in som root på 188.66.62.46 och kör (tom server, inte den live VPS:en):

  curl -fsSL https://raw.githubusercontent.com/pontusburman-papabravo/korpasset/${BRANCH}/scripts/vps-bootstrap.sh | bash

Det installerar Docker, appen, certifikat och skapar SSH-nycklar i
/root/korpasset-access/. Efteråt: cat /root/korpasset-access/cursor_agent
och lägg den som Cursor-secret VPS_SSH_KEY.

Befintlig server: se docs/operations/vps-access.md (deploy-revision, inte bootstrap).
EOF
