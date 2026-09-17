-- Admin authentication for waitlist operators. Separate from student/supervisor users.

BEGIN;

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  email_normalized text NOT NULL,
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CONSTRAINT admin_users_email_normalized_unique UNIQUE (email_normalized),
  CONSTRAINT admin_users_email_length CHECK (char_length(email) BETWEEN 3 AND 120),
  CONSTRAINT admin_users_password_hash_present CHECK (char_length(password_hash) >= 20)
);

CREATE INDEX admin_users_disabled_at_idx ON admin_users (disabled_at);

CREATE TABLE admin_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CONSTRAINT admin_password_reset_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX admin_password_reset_tokens_admin_user_id_idx
  ON admin_password_reset_tokens (admin_user_id);
CREATE INDEX admin_password_reset_tokens_expires_at_idx
  ON admin_password_reset_tokens (expires_at);

COMMIT;
