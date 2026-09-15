# ADR-004: Append-only observations

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Körkortsresan är en historik av vad eleven visat under olika förhållanden och med olika handledare. Att skriva över bedömningar förstör evidens och progression.

## Decision

- `drive_observations` är en **append-only ledger**
- Normal produktkod INSERT — inte UPDATE/DELETE
- Korrigering: ny observation med `supersedes_observation_id` pekande på den tidigare
- Privileged GDPR/admin-process får hantera legitim radering/anonymisering

## Consequences

- Progression engine följer korrigeringskedjor via `supersedes_observation_id`
- Cykel-validering i korrigeringskedjor sker i service layer (ej DB trigger)
- `supersedes_observation_id != id` enforced i DB

## Relaterade dokument

- [Data model](../domain/data-model.md)
- [Progression model](../domain/progression-model.md)
