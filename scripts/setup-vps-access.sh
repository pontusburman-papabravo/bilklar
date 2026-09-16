#!/usr/bin/env bash
# Prints the one-liner to run as root on the VPS.
# Key generation now happens on the server in scripts/vps-bootstrap.sh.
set -euo pipefail

BRANCH="${BOOTSTRAP_REF:-cursor/vps-bootstrap-korpasset-aca8}"

cat <<EOF
Logga in som root på 188.66.62.46 och kör:

  curl -fsSL https://raw.githubusercontent.com/pontusburman-papabravo/korpasset/${BRANCH}/scripts/vps-bootstrap.sh | bash

Det installerar Docker, appen, certifikat och skapar SSH-nycklar i
/root/korpasset-access/. Efteråt: cat /root/korpasset-access/cursor_agent
och lägg den som Cursor-secret VPS_SSH_KEY.

Guide: docs/operations/vps-access.md
EOF
