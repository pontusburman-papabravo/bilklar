import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

const ADMIN_COOKIE = "korpasset_admin";
const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret)
    .update(`admin:${payload}`)
    .digest("base64url");
}

function passwordsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function isAdminConfigured(): boolean {
  return Boolean(config.adminPassword);
}

export function verifyAdminPassword(password: string): boolean {
  if (!config.adminPassword) return false;
  return passwordsEqual(password, config.adminPassword);
}

export function createAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ admin: true, issuedAt: Date.now() }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      admin?: boolean;
    };
    return data.admin === true;
  } catch {
    return false;
  }
}

export function setAdminCookie(reply: FastifyReply): void {
  reply.setCookie(ADMIN_COOKIE, createAdminToken(), {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    signed: false,
    maxAge: ADMIN_MAX_AGE_SECONDS,
  });
}

export function clearAdminCookie(reply: FastifyReply): void {
  reply.clearCookie(ADMIN_COOKIE, { path: "/admin" });
}

export function isAdminRequest(request: FastifyRequest): boolean {
  return parseAdminToken(request.cookies[ADMIN_COOKIE]);
}
