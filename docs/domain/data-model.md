# Data model

Canonical datamodell för Bilklar v1. Implementerad i [`db/migrations/0001_initial.sql`](../../db/migrations/0001_initial.sql).

## Översikt

```text
users ←→ auth_identities
  │
  ├── driving_journeys (student_user_id)
  │     ├── journey_collaborators
  │     ├── journey_invitations
  │     ├── drives
  │     ├── training_focus_items
  │     ├── drive_focus_skills
  │     └── drive_observations
  │
skills ← skill_definitions (versionerad taxonomi)
```

## Enums

| Enum | Värden |
| --- | --- |
| `account_state` | `guest`, `active`, `suspended`, `deleted` |
| `collaborator_role` | `supervisor`, `driving_instructor` |
| `collaborator_status` | `active`, `removed` |
| `invitation_status` | `pending`, `accepted`, `expired`, `revoked` |
| `assessment_level` | `needs_help`, `with_support`, `independent` |
| `observation_source` | `supervisor`, `student`, `system`, `external`, `driving_school` |
| `focus_source` | `student`, `supervisor`, `driving_school`, `system`, `external` |
| `focus_status` | `active`, `completed`, `dismissed` |
| `driving_environment` | `residential`, `urban`, `rural`, `highway` |
| `light_condition` | `daylight`, `dusk_dawn`, `night` |
| `weather_condition` | `dry`, `rain`, `snow_ice`, `fog` |
| `traffic_level` | `light`, `moderate`, `heavy` |
| `transmission_scope` | `unknown`, `manual`, `automatic_only` |
| `journey_status` | `active`, `completed`, `archived` |
| `auth_provider` | `guest`, `apple`, `google`, `passkey`, `email_magic_link` |

## Tabeller

### `users`

Actor/person. Guest och registrerad delar samma modell.

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | Stable genom guest → registered |
| `display_name` | `text` | Nullable för guest |
| `account_state` | `account_state` | `guest` vid QR-handoff |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `auth_identities`

Sätt att autentisera en `user`. En user kan ha flera identities.

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users` | |
| `provider` | `auth_provider` | |
| `provider_subject` | `text` | Unik per provider |
| `created_at` | `timestamptz` | |
| `verified_at` | `timestamptz` | Nullable |

### `driving_journeys`

Elevägd resa. Studenten är **inte** collaborator.

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `student_user_id` | `uuid` FK → `users` | Canonical student |
| `licence_type` | `text` | `B` i v1 |
| `transmission_scope` | `transmission_scope` | `unknown` default |
| `started_at` | `timestamptz` | |
| `status` | `journey_status` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `journey_collaborators`

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `journey_id` | `uuid` FK | |
| `user_id` | `uuid` FK → `users` | |
| `role` | `collaborator_role` | `supervisor` i v1 |
| `status` | `collaborator_status` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Unik:** `(journey_id, user_id)`

### `journey_invitations`

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `journey_id` | `uuid` FK | |
| `invited_by_user_id` | `uuid` FK → `users` | Vanligtvis student |
| `role` | `collaborator_role` | |
| `token_hash` | `text` | Endast hash, aldrig plain token |
| `expires_at` | `timestamptz` | |
| `status` | `invitation_status` | |
| `accepted_at` | `timestamptz` | Sätts vid accept |
| `accepted_by_user_id` | `uuid` FK → `users` | Nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `skills` / `skill_definitions`

`skills.skill_key` är permanent identitet. `skill_definitions` innehåller versionerad presentation.

| `skills` | |
| --- | --- |
| `id` | `uuid` PK |
| `skill_key` | `text` UNIQUE — t.ex. `roundabout_positioning` |

| `skill_definitions` | |
| --- | --- |
| `id` | `uuid` PK |
| `skill_id` | `uuid` FK → `skills` |
| `taxonomy_version` | `integer` |
| `area_key` | `text` |
| `title` | `text` |
| `description` | `text` |
| `sort_order` | `integer` |
| `mvp_priority` | `text` — `core` / `supporting` |
| `created_at` | `timestamptz` |

### `drives`

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `journey_id` | `uuid` FK | |
| `started_by_user_id` | `uuid` FK → `users` | |
| `supervisor_user_id` | `uuid` FK → `users` | |
| `started_at` | `timestamptz` | |
| `ended_at` | `timestamptz` | Nullable |
| `distance_meters` | `integer` | Nullable, ≥ 0 |
| `environment` | `driving_environment[]` | |
| `light_condition` | `light_condition` | |
| `weather_condition` | `weather_condition` | |
| `traffic_level` | `traffic_level` | |
| `created_at` | `timestamptz` | |

**Unik:** `(id, journey_id)` — composite key för journey-isolerade FK.

### `training_focus_items`

> Vad bör eleven träna på?

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `journey_id` | `uuid` FK | |
| `skill_id` | `uuid` FK → `skills` | |
| `source` | `focus_source` | |
| `source_drive_id` | `uuid` | Nullable, journey-isolerad FK |
| `status` | `focus_status` | |
| `note` | `text` | Nullable |
| `created_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | Nullable |

**Unik:** `(id, journey_id)`

### `drive_focus_skills`

> Vad avsåg körpasset att träna?

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `drive_id` | `uuid` | Composite FK med journey |
| `journey_id` | `uuid` | |
| `skill_id` | `uuid` FK → `skills` | |
| `training_focus_item_id` | `uuid` | Nullable, journey-isolerad FK |
| `created_at` | `timestamptz` | |

**Unik:** `(drive_id, journey_id, skill_id)`

### `drive_observations`

Append-only ledger.

| Kolumn | Typ | Notering |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `journey_id` | `uuid` FK | |
| `drive_id` | `uuid` | Composite FK med journey |
| `skill_id` | `uuid` FK → `skills` | |
| `observer_user_id` | `uuid` FK → `users` | Nullable |
| `source_type` | `observation_source` | |
| `assessment` | `assessment_level` | |
| `context_override` | `jsonb` | Nullable |
| `note` | `text` | Nullable |
| `external_source_ref` | `text` | Nullable |
| `supersedes_observation_id` | `uuid` | Nullable, journey-isolerad FK |
| `observed_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

**Unik:** `(id, journey_id)`

## Integrity review

| # | Invariant | Lagring |
| --- | --- | --- |
| 1 | Observation får inte peka på drive i annan journey | **DB** — composite FK `(drive_id, journey_id)` |
| 2 | Drive focus får inte peka på focus item i annan journey | **DB** — composite FK `(training_focus_item_id, journey_id)` |
| 3 | Observation får inte superseda observation i annan journey | **DB** — composite FK `(supersedes_observation_id, journey_id)` |
| 4 | Observation får inte superseda sig själv | **DB** — CHECK `supersedes_observation_id != id` |
| 5 | Correction-chain får inte skapa cykel | **Service layer** — validering vid insert |
| 6 | Supervisor på drive måste höra till journey | **Service layer** — collaborator-check |
| 7 | `started_by_user_id` måste ha relation till journey | **Service layer** — student eller collaborator |
| 8 | Eleven får inte bjudas in som sin egen handledare | **Service layer** — validering vid invitation create/accept |
| 9 | Invitation får inte accepteras två gånger | **DB** — partial unique på `accepted_at`; **service layer** — status transition |
| 10 | Expired/revoked invitation får inte användas | **Service layer** — accept-validering |
| 11 | Completed focus item ska ha `completed_at` | **DB** — CHECK constraint |
| 12 | Active focus item ska normalt inte ha `completed_at` | **DB** — CHECK constraint |

## Observation source rules

| Source | Krav |
| --- | --- |
| `supervisor`, `student` | `observer_user_id` krävs |
| `system` | Ingen actor krävs |
| `external` | `external_source_ref` krävs |
| `driving_school` | `observer_user_id` ELLER `external_source_ref` krävs |

Implementerat som **DB CHECK** på `drive_observations`.

## Relaterade dokument

- [Database architecture](../architecture/database.md)
- [Progression model](progression-model.md)
- [Skill Taxonomy v1](skill-taxonomy.md)
