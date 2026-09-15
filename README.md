# Bilklar

B2C-app för svensk privat övningskörning som håller ihop elevens träning mellan en eller flera handledare.

Kärnfrågor:

- **Vad ska vi träna på idag?**
- **Hur gick det, och vad bör vi träna på nästa gång?**

Långsiktig vision: elevägt **Driving Passport**. v1 är strikt privat övningskörning.

## Dokumentation

### Produkt

- [Vision](docs/product/vision.md)
- [MVP v1](docs/product/mvp-v1.md)
- [Produktprinciper](docs/product/product-principles.md)
- [Onboarding & handoff](docs/product/onboarding-handoff.md)

### Domän

- [Skill Taxonomy v1](docs/domain/skill-taxonomy.md) — 38 skills, status: **Canonical**
- [skill-taxonomy-v1.json](docs/domain/skill-taxonomy-v1.json) — maskinläsbar seed-input
- [Data model](docs/domain/data-model.md)
- [Progression model](docs/domain/progression-model.md)

### Arkitektur

- [Database](docs/architecture/database.md)

### Beslut (ADR)

- [ADR-001: Student-owned journey](docs/decisions/ADR-001-student-owned-journey.md)
- [ADR-002: Actor/auth separation](docs/decisions/ADR-002-actor-auth-separation.md)
- [ADR-003: Skill/context separation](docs/decisions/ADR-003-skill-context-separation.md)
- [ADR-004: Append-only observations](docs/decisions/ADR-004-append-only-observations.md)
- [ADR-005: Observation/focus separation](docs/decisions/ADR-005-observation-focus-separation.md)
- [ADR-006: B2C-first](docs/decisions/ADR-006-b2c-first.md)
- [ADR-007: PostgreSQL 15](docs/decisions/ADR-007-postgresql-15.md)

## Databas

PostgreSQL 15+. Initial migration: [`db/migrations/0001_initial.sql`](db/migrations/0001_initial.sql).

```bash
docker compose -f db/docker-compose.yml up -d
./db/verify-migration.sh
```

## Status

Canonical produkt- och databasgrund. Ingen produkt-UI i denna foundation.
