import { config } from "../config.js";

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(email: OutboundEmail): Promise<void>;
}

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

const DEFAULT_FROM = "Körpasset <support@korpasset.se>";

function resendMailer(): Mailer {
  return {
    async send(email) {
      const apiKey = config.resendApiKey;
      if (!apiKey) {
        throw new EmailSendError("RESEND_API_KEY is not configured");
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: config.emailFrom || DEFAULT_FROM,
          to: [email.to],
          subject: email.subject,
          text: email.text,
        }),
      });
      if (!response.ok) {
        throw new EmailSendError(`Resend responded ${response.status}`);
      }
    },
  };
}

let mailer: Mailer = resendMailer();

export function getMailer(): Mailer {
  return mailer;
}

export function setMailerForTests(next: Mailer | null): void {
  mailer = next ?? resendMailer();
}

export function adminResetEmailText(resetUrl: string): string {
  return [
    "Hej,",
    "",
    "Du har begärt att återställa lösenordet till Körpasset admin.",
    "",
    `Återställ lösenord: ${resetUrl}`,
    "",
    "Länken gäller i 30 minuter.",
    "",
    "Om du inte begärde detta kan du ignorera mejlet.",
    "",
    "Körpasset",
  ].join("\n");
}

export async function sendAdminResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  await getMailer().send({
    to,
    subject: "Återställ lösenordet till Körpasset",
    text: adminResetEmailText(resetUrl),
  });
}
