# ADR-003: Skill/context separation

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Eleven kan vara `independent` på `roundabout_positioning` i `light` traffic men ha lite evidens i `heavy` traffic. Att blanda context in i skill-nycklar skapar combinatorisk explosion och falsk granularitet.

## Decision

**Skill ≠ Context.**

| Dimension | Värden |
| --- | --- |
| Environment | `residential`, `urban`, `rural`, `highway` |
| Light | `daylight`, `dusk_dawn`, `night` |
| Weather | `dry`, `rain`, `snow_ice`, `fog` |
| Traffic | `light`, `moderate`, `heavy` |

Context lagras på `drives` och kan overridas per observation via `context_override` (jsonb).

Skapa inte skills som `roundabout_in_heavy_traffic`.

## Consequences

- Progression engine beräknar evidens per skill × context
- Taxonomin förblir ~38 skills, inte hundratals
- Dessa context-värden ändras inte utan tydligt blockerande skäl

## Relaterade dokument

- [Skill Taxonomy v1](../domain/skill-taxonomy.md)
- [Data model](../domain/data-model.md)
