import { getPool } from "../db/pool.js";

export async function logResendWebhookEvent(options: {
  eventType: string;
  emailId?: string | null;
  svixId?: string | null;
}): Promise<void> {
  if (!options.eventType) return;
  try {
    await getPool().query(
      `INSERT INTO resend_webhook_events (event_type, email_id, svix_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (svix_id) DO NOTHING`,
      [options.eventType, options.emailId ?? null, options.svixId ?? null],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "log_failed";
    console.warn("[RESEND-WEBHOOK] logEvent failed:", message);
  }
}
