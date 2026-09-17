# VPS-access för Körpasset

Inga nya molnkonton. Git är
[`pontusburman-papabravo/korpasset`](https://github.com/pontusburman-papabravo/korpasset).
Servern är Ubuntu 24 på `188.66.62.46`. DNS pekar redan `korpasset.se` och
`*.korpasset.se` dit.

## Ett kommando som root

Logga in som root på den nya servern (Inleed-konsol eller SSH). Klistra in:

```bash
curl -fsSL https://raw.githubusercontent.com/pontusburman-papabravo/korpasset/cursor/vps-bootstrap-korpasset-aca8/scripts/vps-bootstrap.sh | bash
```

När branchen är mergad till `main` kan du byta sökvägen till `/main/scripts/vps-bootstrap.sh`.

Scriptet gör:

1. Docker, UFW (22/80/443), unattended-upgrades
2. Linux-användaren `deploy` med sudo
3. SSH-nycklar för Cursor-agenten och GitHub Actions (`/root/korpasset-access/`)
4. Klonar korpasset till `/var/www/korpasset`
5. Skapar `deploy/.env` (session + databaslösen, inte i git)
6. Startar Postgres 15 + appen + Caddy (Let's Encrypt för `korpasset.se`)

Valfritt, om du har en GitHub-token med rätt att skriva secrets:

```bash
GH_TOKEN=… curl -fsSL https://raw.githubusercontent.com/pontusburman-papabravo/korpasset/cursor/vps-bootstrap-korpasset-aca8/scripts/vps-bootstrap.sh | bash
```

Då sätts GitHub environment `vps` automatiskt. Extra egen SSH-nyckel:

```bash
EXTRA_SSH_PUBKEY='ssh-ed25519 AAAA… din-mac' bash scripts/vps-bootstrap.sh
```

## Vad som inte kan göras från servern

Cursor-secrets injiceras bara vid **start** av en agent. Efter scriptet:

1. `cat /root/korpasset-access/cursor_agent` → Cursor runtime secret `VPS_SSH_KEY`
2. Environment variables: `VPS_HOST=188.66.62.46`, `VPS_USER=deploy`, `VPS_APP_PATH=/var/www/korpasset`
3. Starta en **ny** agent (den här körningen ser inte secret:en)

Klistra inte in den privata nyckeln i chatten.

Cursor runtime secrets kan flatten:a `VPS_SSH_KEY` till en rad (mellanslag
istället för PEM-radbrytningar) och lämna inledande mellanslag på
`VPS_HOST` / `VPS_USER` / `VPS_APP_PATH`. `scripts/vps-ssh.sh` strippar
värdena och rekonstruerar OpenSSH-PEM (body 70 tecken). Nyckeln ska inte
in i git.

| Vem | Hur |
| --- | --- |
| **Du som root** | Inleed-konsol, en gång, kör scriptet |
| **Cursor-agent** | SSH som `deploy` med `VPS_SSH_KEY` |
| **Git på servern** | `git fetch` mot HTTPS, read-only, inget bot-konto |
| **GitHub Actions** | SSH som `deploy` med nyckeln i environment `vps` |

Skapa inte extra GitHub-användare, Docker Hub, Cloudflare eller Let's Encrypt-konto.
