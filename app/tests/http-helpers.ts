import type { InjectOptions, Response } from "light-my-request";
import type { FastifyInstance } from "fastify";
import { config } from "../src/config.js";

export type SessionCookies = Record<string, string>;

export function cookiesFromResponse(response: Response): SessionCookies {
  const jar: SessionCookies = {};
  for (const cookie of response.cookies) {
    jar[cookie.name] = cookie.value;
  }
  return jar;
}

export function mergeCookies(
  base: SessionCookies,
  response: Response,
): SessionCookies {
  return { ...base, ...cookiesFromResponse(response) };
}

export async function injectWithSession(
  app: FastifyInstance,
  cookies: SessionCookies,
  options: InjectOptions,
): Promise<Response> {
  return app.inject({
    ...options,
    cookies,
  });
}

export function extractPathFromRedirect(
  response: Response,
  pattern: RegExp,
): string | undefined {
  const location = response.headers.location;
  if (typeof location !== "string") return undefined;
  const match = location.match(pattern);
  return match?.[1];
}

export function extractInviteToken(html: string): string {
  const match = html.match(
    new RegExp(`${config.appBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/invite/([^"\\s<]+)`),
  );
  if (!match) {
    throw new Error("Invite token not found in HTML");
  }
  return match[1];
}

export function formBody(fields: Record<string, string | string[]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.append(key, value);
    }
  }
  return params.toString();
}
