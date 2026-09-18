-- Privileged admin write audit. Separate from product users; not an analytics platform.

BEGIN;

CREATE TABLE admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id),
  operation text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  summary text NOT NULL,
  CONSTRAINT admin_audit_events_operation_length CHECK (char_length(operation) BETWEEN 1 AND 80),
  CONSTRAINT admin_audit_events_target_type_length CHECK (char_length(target_type) BETWEEN 1 AND 80),
  CONSTRAINT admin_audit_events_target_id_length CHECK (char_length(target_id) BETWEEN 1 AND 80),
  CONSTRAINT admin_audit_events_summary_length CHECK (char_length(summary) BETWEEN 1 AND 4000)
);

CREATE INDEX admin_audit_events_created_at_idx ON admin_audit_events (created_at DESC);
CREATE INDEX admin_audit_events_admin_user_id_idx ON admin_audit_events (admin_user_id);
CREATE INDEX admin_audit_events_target_idx ON admin_audit_events (target_type, target_id);

COMMIT;
