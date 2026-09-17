import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 300;

function decodeWebhookSecret(secret: string): Buffer | null {
  if (!secret) return null;
  const prefix = "whsec_";
  if (secret.startsWith(prefix)) {
    return Buffer.from(secret.slice(prefix.length), "base64");
  }
  return Buffer.from(secret, "utf8");
}

export interface ResendWebhookEvent {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
  };
}

export function verifyResendWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): ResendWebhookEvent | null {
  const svixId = headerValue(headers, "svix-id");
  const svixTimestamp = headerValue(headers, "svix-timestamp");
  const svixSignature = headerValue(headers, "svix-signature");
  const key = decodeWebhookSecret(secret);

  if (!svixId || !svixTimestamp || !svixSignature || !key) return null;

  const ts = Number.parseInt(svixTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
    return null;
  }

  const signed = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");

  const signatures = svixSignature.split(" ");
  let valid = false;
  for (const part of signatures) {
    const comma = part.indexOf(",");
    if (comma === -1) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== "v1" || !sig) continue;
    try {
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
        valid = true;
        break;
      }
    } catch {
      // length mismatch — try next signature
    }
  }

  if (!valid) return null;

  try {
    return JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return null;
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}
