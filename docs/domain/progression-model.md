# Progression model

Progression är ett **beräknat read model** — inte canonical DB-state.

## Princip

```text
Observations (append-only ledger)
    ↓
Progression Engine (beräknar)
    ↓
Read model (per skill, per context, per journey)
    ↓
Recommendation Engine (i kod)
    ↓
Training Focus (persisted intent)
```

Recommendation logic och progression scores **lagras inte** som canonical tabeller. De beräknas vid behov från observations och journey-metadata.

## Input

| Källa | Användning |
| --- | --- |
| `drive_observations` | Senaste och historisk evidens per skill |
| Context på drive | `environment[]`, `light_condition`, `weather_condition`, `traffic_level` |
| `context_override` på observation | Avvikande context för just den bedömningen |
| `transmission_scope` på journey | `car_control_gear_shifting` → `not_applicable` vid `automatic_only` |
| `supersedes_observation_id` | Korrigeringskedja — senaste giltiga observation per kedja |

## Assessment → progression

Tre nivåer — se [MVP v1](../product/mvp-v1.md):

- `needs_help`
- `with_support`
- `independent`

Progression engine v1 behöver inte implementeras i denna foundation-PR. Detta dokument låser designen så nästa implementation vet vad som är read model vs persisted state.

## Transmission scope

| Scope | Effekt på `car_control_gear_shifting` |
| --- | --- |
| `unknown` | Skill kan bedömas normalt |
| `manual` | Skill kan bedömas normalt |
| `automatic_only` | Skill behandlas som `not_applicable` i progression — inte borttagen från taxonomin |

## Vad som inte är progression

| Begrepp | Varför inte progression |
| --- | --- |
| Training Focus | Framåtblickande intent — separat entitet |
| Drive Focus | Plan för ett specifikt körpass — separat entitet |
| Prerequisite-graf | Analys i taxonomin, inte DB-constraint |

## Relaterade dokument

- [Data model](data-model.md)
- [Skill Taxonomy v1](skill-taxonomy.md)
- [ADR-004: Append-only observations](../decisions/ADR-004-append-only-observations.md)
