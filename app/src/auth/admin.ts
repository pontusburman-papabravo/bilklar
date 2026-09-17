import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { getAdminUserById, type AdminUser } from "../services/admin-users.js";

export const ADMIN_COOKIE = "korpasset_admin";
const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 12;

interface AdminSession {
  adminUserId: string;
  issuedAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret)
    .update(`admin:${payload}`)
    .digest("base64url");
}

export function createAdminToken(adminUserId: string, issuedAt = Date.now()): string {
  const data: AdminSession = { adminUserId, issuedAt };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseAdminToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;
    if (!data.adminUserId || typeof data.adminUserId !== "string") return null;
    if (typeof data.issuedAt !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function setAdminCookie(reply: FastifyReply, adminUserId: string): void {
  reply.setCookie(ADMIN_COOKIE, createAdminToken(adminUserId), {
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

export async function getAdminFromRequest(
  request: FastifyRequest,
): Promise<AdminUser | null> {
  const session = parseAdminToken(request.cookies[ADMIN_COOKIE]);
  if (!session) return null;
  const admin = await getAdminUserById(session.adminUserId);
  if (!admin || admin.disabledAt) return null;
  if (session.issuedAt <= admin.passwordChangedAt.getTime()) return null;
  return admin;
}
