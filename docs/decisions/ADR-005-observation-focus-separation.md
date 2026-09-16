# ADR-005: Observation/focus separation

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Körpasset ska svara på två frågor: vad ska vi träna på, och hur gick det? Dessa är olika begrepp som inte får blandas i datamodellen.

## Decision

Tre separata domänbegrepp:

| Begrepp | Fråga | Tabell |
| --- | --- | --- |
| **Observation** | Vad visade eleven att hen kunde? | `drive_observations` |
| **Training Focus** | Vad bör eleven träna på framåt? | `training_focus_items` |
| **Drive Focus** | Vad avsåg just detta körpass att träna? | `drive_focus_skills` |

Recommendation logic ligger i kod — inte som canonical DB-state.

## Consequences

- En observation skapar inte automatiskt training focus
- Drive focus kan länka till befintlig training focus item (optional)
- Progression är read model — inte samma sak som focus

## Relaterade dokument

- [MVP v1](../product/mvp-v1.md)
- [Progression model](../domain/progression-model.md)
- [Data model](../domain/data-model.md)
