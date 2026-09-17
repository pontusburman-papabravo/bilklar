-- Waitlist / intresseanmälningar for korpasset.se landing.

BEGIN;

CREATE TYPE interest_role AS ENUM (
  'student',
  'parent',
  'supervisor',
  'other'
);

CREATE TYPE interest_status AS ENUM (
  'new',
  'contacted',
  'invited',
  'declined'
);

CREATE TABLE interest_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email text NOT NULL,
  email_normalized text NOT NULL,
  role interest_role NOT NULL,
  city text CHECK (city IS NULL OR char_length(city) BETWEEN 1 AND 80),
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  status interest_status NOT NULL DEFAULT 'new',
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000),
  CONSTRAINT interest_signups_email_normalized_unique UNIQUE (email_normalized)
);

CREATE INDEX interest_signups_created_at_idx ON interest_signups (created_at DESC);
CREATE INDEX interest_signups_status_idx ON interest_signups (status);

COMMIT;
