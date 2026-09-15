-- Bilklar initial schema
-- Requires PostgreSQL 15+ (column-specific ON DELETE SET NULL on composite FKs)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE account_state AS ENUM (
  'guest',
  'active',
  'suspended',
  'deleted'
);

CREATE TYPE collaborator_role AS ENUM (
  'supervisor',
  'driving_instructor'
);

CREATE TYPE collaborator_status AS ENUM (
  'active',
  'removed'
);

CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);

CREATE TYPE assessment_level AS ENUM (
  'needs_help',
  'with_support',
  'independent'
);

CREATE TYPE observation_source AS ENUM (
  'supervisor',
  'student',
  'system',
  'external',
  'driving_school'
);

CREATE TYPE focus_source AS ENUM (
  'student',
  'supervisor',
  'driving_school',
  'system',
  'external'
);

CREATE TYPE focus_status AS ENUM (
  'active',
  'completed',
  'dismissed'
);

CREATE TYPE driving_environment AS ENUM (
  'residential',
  'urban',
  'rural',
  'highway'
);

CREATE TYPE light_condition AS ENUM (
  'daylight',
  'dusk_dawn',
  'night'
);

CREATE TYPE weather_condition AS ENUM (
  'dry',
  'rain',
  'snow_ice',
  'fog'
);

CREATE TYPE traffic_level AS ENUM (
  'light',
  'moderate',
  'heavy'
);

CREATE TYPE transmission_scope AS ENUM (
  'unknown',
  'manual',
  'automatic_only'
);

CREATE TYPE journey_status AS ENUM (
  'active',
  'completed',
  'archived'
);

CREATE TYPE auth_provider AS ENUM (
  'guest',
  'apple',
  'google',
  'passkey',
  'email_magic_link'
);

-- ---------------------------------------------------------------------------
-- Users & auth
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text,
  account_state account_state NOT NULL DEFAULT 'guest',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_identities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider          auth_provider NOT NULL,
  provider_subject  text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  verified_at       timestamptz,
  CONSTRAINT auth_identities_provider_subject_unique
    UNIQUE (provider, provider_subject)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities (user_id);

-- ---------------------------------------------------------------------------
-- Journey
-- ---------------------------------------------------------------------------

CREATE TABLE driving_journeys (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id    uuid NOT NULL REFERENCES users (id),
  licence_type       text NOT NULL DEFAULT 'B',
  transmission_scope transmission_scope NOT NULL DEFAULT 'unknown',
  started_at         timestamptz NOT NULL DEFAULT now(),
  status             journey_status NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_driving_journeys_student_user_id ON driving_journeys (student_user_id);

CREATE TABLE journey_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id  uuid NOT NULL REFERENCES driving_journeys (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id),
  role        collaborator_role NOT NULL,
  status      collaborator_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journey_collaborators_journey_user_unique
    UNIQUE (journey_id, user_id)
);

CREATE INDEX idx_journey_collaborators_journey_id ON journey_collaborators (journey_id);
CREATE INDEX idx_journey_collaborators_user_id ON journey_collaborators (user_id);

CREATE TABLE journey_invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id           uuid NOT NULL REFERENCES driving_journeys (id) ON DELETE CASCADE,
  invited_by_user_id   uuid NOT NULL REFERENCES users (id),
  role                 collaborator_role NOT NULL DEFAULT 'supervisor',
  token_hash           text NOT NULL,
  expires_at           timestamptz NOT NULL,
  status               invitation_status NOT NULL DEFAULT 'pending',
  accepted_at          timestamptz,
  accepted_by_user_id  uuid REFERENCES users (id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journey_invitations_token_hash_unique
    UNIQUE (token_hash),
  CONSTRAINT journey_invitations_accepted_requires_fields
    CHECK (
      status != 'accepted'
      OR (accepted_at IS NOT NULL AND accepted_by_user_id IS NOT NULL)
    ),
  CONSTRAINT journey_invitations_pending_not_accepted
    CHECK (
      status != 'pending'
      OR (accepted_at IS NULL AND accepted_by_user_id IS NULL)
    )
);

CREATE INDEX idx_journey_invitations_journey_id ON journey_invitations (journey_id);
CREATE INDEX idx_journey_invitations_status ON journey_invitations (status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Skills (global taxonomy identity)
-- ---------------------------------------------------------------------------

CREATE TABLE skills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skills_skill_key_unique UNIQUE (skill_key)
);

CREATE TABLE skill_definitions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id          uuid NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  taxonomy_version  integer NOT NULL,
  area_key          text NOT NULL,
  title             text NOT NULL,
  description       text NOT NULL,
  sort_order        integer NOT NULL,
  mvp_priority      text NOT NULL CHECK (mvp_priority IN ('core', 'supporting')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skill_definitions_skill_version_unique
    UNIQUE (skill_id, taxonomy_version)
);

CREATE INDEX idx_skill_definitions_taxonomy_version ON skill_definitions (taxonomy_version);

-- ---------------------------------------------------------------------------
-- Drives
-- ---------------------------------------------------------------------------

CREATE TABLE drives (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  journey_id          uuid NOT NULL REFERENCES driving_journeys (id) ON DELETE CASCADE,
  started_by_user_id  uuid NOT NULL REFERENCES users (id),
  supervisor_user_id  uuid NOT NULL REFERENCES users (id),
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  distance_meters     integer,
  environment         driving_environment[] NOT NULL DEFAULT '{}',
  light_condition     light_condition,
  weather_condition   weather_condition,
  traffic_level       traffic_level,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, journey_id),
  CONSTRAINT drives_ended_after_started
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT drives_distance_non_negative
    CHECK (distance_meters IS NULL OR distance_meters >= 0)
);

CREATE INDEX idx_drives_journey_id ON drives (journey_id);
CREATE INDEX idx_drives_started_at ON drives (journey_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Training focus
-- ---------------------------------------------------------------------------

CREATE TABLE training_focus_items (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  journey_id       uuid NOT NULL REFERENCES driving_journeys (id) ON DELETE CASCADE,
  skill_id         uuid NOT NULL REFERENCES skills (id),
  source           focus_source NOT NULL,
  source_drive_id  uuid,
  status           focus_status NOT NULL DEFAULT 'active',
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  PRIMARY KEY (id, journey_id),
  CONSTRAINT training_focus_completed_has_timestamp
    CHECK (status != 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT training_focus_active_no_completed_at
    CHECK (status != 'active' OR completed_at IS NULL),
  CONSTRAINT training_focus_source_drive_journey_fk
    FOREIGN KEY (source_drive_id, journey_id)
    REFERENCES drives (id, journey_id)
    ON DELETE SET NULL (source_drive_id)
);

CREATE INDEX idx_training_focus_items_journey_id ON training_focus_items (journey_id);
CREATE INDEX idx_training_focus_items_journey_status ON training_focus_items (journey_id, status)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Drive focus
-- ---------------------------------------------------------------------------

CREATE TABLE drive_focus_skills (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id                uuid NOT NULL,
  journey_id              uuid NOT NULL,
  skill_id                uuid NOT NULL REFERENCES skills (id),
  training_focus_item_id  uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drive_focus_skills_drive_journey_fk
    FOREIGN KEY (drive_id, journey_id)
    REFERENCES drives (id, journey_id)
    ON DELETE CASCADE,
  CONSTRAINT drive_focus_skills_focus_item_journey_fk
    FOREIGN KEY (training_focus_item_id, journey_id)
    REFERENCES training_focus_items (id, journey_id)
    ON DELETE SET NULL (training_focus_item_id),
  CONSTRAINT drive_focus_skills_drive_skill_unique
    UNIQUE (drive_id, journey_id, skill_id)
);

CREATE INDEX idx_drive_focus_skills_drive ON drive_focus_skills (drive_id, journey_id);

-- ---------------------------------------------------------------------------
-- Observations (append-only ledger)
-- ---------------------------------------------------------------------------

CREATE TABLE drive_observations (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  journey_id                uuid NOT NULL REFERENCES driving_journeys (id) ON DELETE CASCADE,
  drive_id                  uuid NOT NULL,
  skill_id                  uuid NOT NULL REFERENCES skills (id),
  observer_user_id          uuid REFERENCES users (id),
  source_type               observation_source NOT NULL,
  assessment                assessment_level NOT NULL,
  context_override          jsonb,
  note                      text,
  external_source_ref       text,
  supersedes_observation_id uuid,
  observed_at               timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, journey_id),
  CONSTRAINT drive_observations_drive_journey_fk
    FOREIGN KEY (drive_id, journey_id)
    REFERENCES drives (id, journey_id)
    ON DELETE CASCADE,
  CONSTRAINT drive_observations_no_self_supersede
    CHECK (supersedes_observation_id IS NULL OR supersedes_observation_id != id),
  CONSTRAINT drive_observations_supersedes_journey_fk
    FOREIGN KEY (supersedes_observation_id, journey_id)
    REFERENCES drive_observations (id, journey_id)
    ON DELETE SET NULL (supersedes_observation_id),
  CONSTRAINT drive_observations_source_rules CHECK (
    CASE source_type
      WHEN 'system' THEN true
      WHEN 'external' THEN external_source_ref IS NOT NULL
      WHEN 'supervisor' THEN observer_user_id IS NOT NULL
      WHEN 'student' THEN observer_user_id IS NOT NULL
      WHEN 'driving_school' THEN
        observer_user_id IS NOT NULL OR external_source_ref IS NOT NULL
    END
  )
);

CREATE INDEX idx_drive_observations_journey_id ON drive_observations (journey_id);
CREATE INDEX idx_drive_observations_drive_id ON drive_observations (drive_id, journey_id);
CREATE INDEX idx_drive_observations_skill_id ON drive_observations (journey_id, skill_id);
CREATE INDEX idx_drive_observations_observed_at ON drive_observations (journey_id, observed_at DESC);

CREATE UNIQUE INDEX idx_drive_observations_single_superseder
  ON drive_observations (supersedes_observation_id, journey_id)
  WHERE supersedes_observation_id IS NOT NULL;

COMMIT;
