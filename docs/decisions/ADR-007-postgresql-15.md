# ADR-007: PostgreSQL 15

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Bilklar behöver journey-isolerade composite foreign keys med kolumnspecifik `ON DELETE SET NULL`. Exempel: om ett drive raderas (GDPR) ska `training_focus_items.source_drive_id` nullifieras men `journey_id` behållas.

## Decision

**PostgreSQL 15+** som canonical databas.

Använd kolumnspecifik syntax:

```sql
ON DELETE SET NULL (column_name)
```

Inget tungt ORM introduceras i foundation-PR. Raw SQL migration.

## Consequences

- `db/migrations/0001_initial.sql` är source of truth
- Docker Compose för lokal utveckling och CI-verifiering
- Äldre PostgreSQL-versioner stöds inte

## Relaterade dokument

- [Database](../architecture/database.md)
- [Data model](../domain/data-model.md)
