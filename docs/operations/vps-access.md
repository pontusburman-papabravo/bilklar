# VPS-access för Körpasset

Inga nya molnkonton. Git är det omdöpta repot
[`pontusburman-papabravo/korpasset`](https://github.com/pontusburman-papabravo/korpasset).
Servern är Ubuntu 24 på `188.66.62.46`. DNS pekar redan `korpasset.se` och
`*.korpasset.se` dit.

## Vad du redan har

| Redan klart | Skapa inte |
| --- | --- |
| Inleed (servern + root via webbkonsol) | Extra GitHub-användare / bot |
| Ditt GitHub-konto och `korpasset`-repot | Docker Hub-konto |
| DNS A + wildcard CNAME | Cloudflare / annat DNS-konto |
| Cursor Cloud Agent | Let's Encrypt-konto (Caddy skapar cert själv) |

Let's Encrypt behöver bara en e-postadress. Den sätts i `deploy/Caddyfile`.

## Hur access fungerar

Tre riktningar. Inget av dem är ett nytt konto — det är nycklar.

```text
Du (Inleed-konsol, första gången)
        ↓  klistrar in 2 publika SSH-nycklar
VPS  deploy@188.66.62.46
        ↑                         ↑
        │ SSH                     │ git fetch (HTTPS, repo är publikt)
Cursor-agent                 GitHub Actions
(VPS_SSH_KEY i Cursor)       (VPS_SSH_KEY i environment vps)
```

| Vem | Kommer in hur | Behörighet |
| --- | --- | --- |
| **Cursor-agenten (jag)** | SSH som `deploy` med nyckel i Cursor-secret `VPS_SSH_KEY` | installera, loggar, omstart |
| **Git** på servern | `git clone`/`git fetch` mot `https://github.com/pontusburman-papabravo/korpasset.git` | read-only. Servern pushar aldrig |
| **GitHub Actions** | SSH som `deploy` med en **annan** nyckel i GitHub environment `vps` | deploy efter merge till `main` |

Gör **inte** ett separat GitHub-konto för deploy. Actions använder redan
`GITHUB_TOKEN` för att läsa repot. Servern behöver ingen write-token.

Om du senare gör repot privat: skapa en **Deploy key** (read-only) under
GitHub → Settings → Deploy keys. Ingen extra användare då heller.

## Du gör tre saker, sen tar agenten över

Kör på din Mac i en klon av korpasset:

```bash
chmod +x scripts/setup-vps-access.sh
./scripts/setup-vps-access.sh
```

Scriptet skapar två ed25519-nycklar och skriver ut exakt vad du ska klistra in.

### 1. Inleed webbkonsol som root

Klistra in blocket som scriptet skriver ut. Det skapar Linux-användaren
`deploy` och lägger in de två **publika** nycklarna i `authorized_keys`.

Använd inte root-lösenord i chatten och inte som Cursor-secret.

### 2. Cursor → Cloud Agents → Secrets

| Namn | Typ | Innehåll |
| --- | --- | --- |
| `VPS_SSH_KEY` | Runtime Secret | hela **privata** filen `~/.ssh/korpasset_cursor_agent` |
| `VPS_HOST` | Environment Variable | `188.66.62.46` |
| `VPS_USER` | Environment Variable | `deploy` |
| `VPS_APP_PATH` | Environment Variable | `/var/www/korpasset` |

Nyckeln injiceras vid **nästa** agent-körning. Denna körning ser den inte.

### 3. GitHub environment `vps`

```bash
gh api -X PUT repos/pontusburman-papabravo/korpasset/environments/vps
gh secret set VPS_SSH_KEY --repo pontusburman-papabravo/korpasset -e vps < ~/.ssh/korpasset_github_actions
gh variable set VPS_HOST --repo pontusburman-papabravo/korpasset -e vps -b 188.66.62.46
gh variable set VPS_USER --repo pontusburman-papabravo/korpasset -e vps -b deploy
gh variable set VPS_APP_PATH --repo pontusburman-papabravo/korpasset -e vps -b /var/www/korpasset
gh variable set VPS_HEALTH_URL --repo pontusburman-papabravo/korpasset -e vps -b http://127.0.0.1:3000/health
```

UI: https://github.com/pontusburman-papabravo/korpasset/settings/environments

## Vad som händer automatiskt efter det

När `deploy@188.66.62.46` tar emot Cursor-nyckeln kör agenten
`scripts/vps-bootstrap.sh` som:

1. installerar Docker + Compose
2. sätter UFW (22/80/443) och unattended-upgrades
3. klonar `korpasset` till `/var/www/korpasset`
4. skapar `deploy/.env` (`SESSION_SECRET`, Postgres-lösen) på disken — inte i git
5. startar Postgres 15 + appen + Caddy (Let's Encrypt för `korpasset.se`)

Efter merge till `main` deployar `.github/workflows/deploy.yml` samma väg.

## Säg till när steg 1–2 är klara

Då SSH:ar jag in och kör bootstrap. Steg 3 (GitHub Actions) kan vänta tills
första merge, men nyckeln måste ligga i `authorized_keys` redan i steg 1.
