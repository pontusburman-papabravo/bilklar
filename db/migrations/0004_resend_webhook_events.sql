-- Resend webhook event log. Diagnostics only; not a source of truth for product stats.

BEGIN;

CREATE TABLE resend_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  email_id text,
  svix_id text,
  CONSTRAINT resend_webhook_events_event_type_length CHECK (char_length(event_type) BETWEEN 1 AND 64),
  CONSTRAINT resend_webhook_events_svix_id_unique UNIQUE (svix_id)
);

CREATE INDEX resend_webhook_events_received_at_idx
  ON resend_webhook_events (received_at);
CREATE INDEX resend_webhook_events_event_type_received_at_idx
  ON resend_webhook_events (event_type, received_at);

COMMIT;
