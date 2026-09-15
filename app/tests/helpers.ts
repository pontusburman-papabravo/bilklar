import { createSessionToken } from "../src/auth/session.js";
import { buildServer } from "../src/http/server.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(): Promise<FastifyInstance> {
  return buildServer();
}

export function sessionCookie(userId: string): { cookie: string } {
  const token = createSessionToken(userId);
  return { cookie: `bilklar_session=${token}` };
}

export async function extractRedirectLocation(
  response: { statusCode: number; headers: Record<string, unknown> },
): Promise<string | undefined> {
  const location = response.headers.location;
  return typeof location === "string" ? location : undefined;
}
