# Production

Minsta produktionsbara körning för Körpassets första beta. En Fastify-process + PostgreSQL 15. Ingen microservice-split.

Git: https://github.com/pontusburman-papabravo/korpasset

## Canonical routing

Ett origin:

| URL | Vad |
| --- | --- |
| `https://korpasset.se` | Landning + intresseanmälan. Inloggad användare med resa går till produkten. |
| `https://korpasset.se/onboarding` | Skapa elevresa |
| `https://korpasset.se/invite/<token>` | Canonical invitation-länk |
| `https://korpasset.se/integritet` `/villkor` `/kontakt` | Legal |
| `https://korpasset.se/admin` | Waitlist-admin (kräver `ADMIN_PASSWORD`) |
| `https://korpasset.se/health` | Health, ingen auth |

Ingen `app.`-subdomän i första betan. Samma host förenklar cookies, QR, SMS och en Capacitor-shell som laddar produktionens origin.

Invitationer byggs från `APP_BASE_URL`. Den **måste** vara `https://korpasset.se` i produktion — annars pekar QR mot localhost.

## Vad som måste sättas utanför repo

| Variabel | Krav |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres 15-anslutning. Inget default i produktion. |
| `SESSION_SECRET` | Minst 32 tecken. Inte utvecklingsdefaulten. |
| `APP_BASE_URL` | `https://korpasset.se` |
| `PORT` | Valfritt, default `3000` |
| `ADMIN_PASSWORD` | Valfritt. Sätts för att öppna `/admin` och hantera intresseanmälningar. Utan variabeln svarar admin 404. |

Appen vägrar starta i `NODE_ENV=production` om secrets saknas, om `SESSION_SECRET` är dev-default, eller om `APP_BASE_URL` inte är https (`ALLOW_HTTP=true` endast för lokal prod-lik körning).

Session-cookien `bilklar_session` sätts med `Secure` när `APP_BASE_URL` är https.

Mall: [`app/.env.example`](../../app/.env.example). Committa aldrig `.env`.

## Image och start

Från reporoot:

```bash
docker build -t korpasset-app .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e APP_BASE_URL=https://korpasset.se \
  korpasset-app
```

Startsekvens i containern:

1. `assertProductionConfig`
2. `applyMigrations` (idempotent)
3. taxonomy seed (idempotent)
4. lyssna på `0.0.0.0:$PORT`

Manuell migrate utan att starta appen (dev):

```bash
cd app
npm run migrate
```

Befintliga databaser där `0001_initial.sql` redan körts stämplas i `schema_migrations` utan att SQL körs om.

## Health och loggning

- `GET /health` → `200 { status: "ok" }` om `SELECT 1` mot Postgres lyckas, annars `503`.
- Svaret innehåller `x-request-id`. Klienten kan skicka samma header.
- Produktion loggar JSON via Fastify. Cookies, `Authorization` och invitation-tokens i `/invite/...` redakteras.
- `uncaughtException` / `unhandledRejection` loggas och processen avslutas.

Inga hemligheter, invitation-tokens eller personnamn ska läggas till i loggar.

## Backup och restore

Ta dump **före** migrate som ändrar schema, och rutinmässigt (minst dagligen när beta är live).

```bash
# Backup (custom format, lämpligt för pg_restore)
pg_dump -Fc "$DATABASE_URL" -f "korpasset-$(date -u +%Y%m%dT%H%M%SZ).dump"

# Restore mot tom eller återställd databas
pg_restore --clean --if-exists --no-owner --no-acl -d "$DATABASE_URL" korpasset-YYYYMMDD.dump
```

Efter restore: starta appen (migrate är no-op om `schema_migrations` följde med dump:en). Verifiera `GET /health`.

Lagra dump utanför apprecot. Innehållet är personuppgifter (namn, journey-data).

## Test vs production

| | Lokal test | Produktion |
| --- | --- | --- |
| Postgres | embedded-postgres i `npm test`, eller `db/docker-compose.yml` | Managed Postgres 15 |
| Secrets | repo-defaults tillåtna | env, inga defaults |
| `APP_BASE_URL` | `http://localhost:3000` | `https://korpasset.se` |
| Cookie `Secure` | av | på |
| Logger | av | på, redacted |

`db/verify-migration.sh` är fortfarande för schema-invarianter mot en nollställd databas. Den är inte deploy-sökvägen.

## Host och DNS (manuellt)

Koden gissar inte hostingleverantör. Vilken som helst som kör Docker-imagen + Postgres 15 + TLS räcker.

Pontus behöver:

1. DNS för `korpasset.se` → load balancer / host
2. TLS-certifikat (ofta automatiskt hos hosten)
3. Managed Postgres 15 med persistent disk
4. Env-variablerna ovan i hostens secret store
5. En första restore-övning av en dummy-dump

Tills DNS och host finns kan imagen byggas och testerna köras lokalt, men invitationer och cookies mot riktiga telefoner kräver `https://korpasset.se`.
