import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../errors.js";
import { getPool } from "../db/pool.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";

export const ADMIN_RESET_TTL_MS = 30 * 60 * 1000;
export const ADMIN_RESET_NEUTRAL_MESSAGE =
  "Om adressen finns skickar vi en återställningslänk.";

export interface AdminUser {
  id: string;
  email: string;
  emailNormalized: string;
  passwordChangedAt: Date;
  disabledAt: Date | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mapAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    email: String(row.email),
    emailNormalized: String(row.email_normalized),
    passwordChangedAt: new Date(row.password_changed_at as string | Date),
    disabledAt: row.disabled_at ? new Date(String(row.disabled_at)) : null,
  };
}

export async function countEnabledAdmins(): Promise<number> {
  const result = await getPool().query(
    `SELECT count(*)::int AS count FROM admin_users WHERE disabled_at IS NULL`,
  );
  return result.rows[0]?.count ?? 0;
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  const result = await getPool().query(`SELECT * FROM admin_users WHERE id = $1`, [id]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapAdmin(row) : null;
}

export async function getEnabledAdminByEmail(
  email: string,
): Promise<AdminUser | null> {
  const result = await getPool().query(
    `SELECT * FROM admin_users
     WHERE email_normalized = $1 AND disabled_at IS NULL`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapAdmin(row) : null;
}

export async function createAdminUser(
  email: string,
  password: string,
): Promise<AdminUser> {
  const trimmed = email.trim();
  const emailNormalized = normalizeEmail(trimmed);
  if (!isEmail(emailNormalized)) {
    throw new AppError("Ange en giltig e-postadress", 400, "invalid_email");
  }
  const passwordHash = await hashPassword(password);
  try {
    const result = await getPool().query(
      `INSERT INTO admin_users (email, email_normalized, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [trimmed, emailNormalized, passwordHash],
    );
    return mapAdmin(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw new AppError("En admin med den e-postadressen finns redan", 409, "duplicate_email");
    }
    throw error;
  }
}

let dummyPasswordHash: string | null = null;

async function hashForUnknownAccount(password: string): Promise<void> {
  if (!dummyPasswordHash) {
    dummyPasswordHash = await hashPassword("korpasset-dummy-timing");
  }
  await verifyPassword(password, dummyPasswordHash);
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminUser | null> {
  const result = await getPool().query(
    `SELECT * FROM admin_users WHERE email_normalized = $1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    await hashForUnknownAccount(password);
    return null;
  }
  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) return null;
  const admin = mapAdmin(row);
  if (admin.disabledAt) return null;
  return admin;
}

export async function createPasswordResetToken(
  adminUserId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_RESET_TTL_MS);
  await getPool().query(
    `UPDATE admin_password_reset_tokens
     SET used_at = COALESCE(used_at, now())
     WHERE admin_user_id = $1 AND used_at IS NULL`,
    [adminUserId],
  );
  await getPool().query(
    `INSERT INTO admin_password_reset_tokens (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [adminUserId, hashToken(rawToken), expiresAt.toISOString()],
  );
  return { rawToken, expiresAt };
}

export async function requestAdminPasswordReset(email: string): Promise<{
  created: boolean;
  rawToken?: string;
  expiresAt?: Date;
  admin?: AdminUser;
}> {
  const emailNormalized = normalizeEmail(email);
  if (!isEmail(emailNormalized)) {
    return { created: false };
  }
  const admin = await getEnabledAdminByEmail(emailNormalized);
  if (!admin) {
    return { created: false };
  }
  const token = await createPasswordResetToken(admin.id);
  return { created: true, rawToken: token.rawToken, expiresAt: token.expiresAt, admin };
}

export async function resetAdminPassword(
  rawToken: string,
  newPassword: string,
): Promise<AdminUser> {
  if (!rawToken.trim()) {
    throw new AppError("Ogiltig eller utgången länk", 400, "invalid_reset_token");
  }
  const passwordHash = await hashPassword(newPassword);
  const result = await getPool().query(
    `SELECT t.id, t.admin_user_id, t.expires_at, t.used_at, u.disabled_at
     FROM admin_password_reset_tokens t
     JOIN admin_users u ON u.id = t.admin_user_id
     WHERE t.token_hash = $1`,
    [hashToken(rawToken)],
  );
  const row = result.rows[0] as
    | {
        id: string;
        admin_user_id: string;
        expires_at: Date;
        used_at: Date | null;
        disabled_at: Date | null;
      }
    | undefined;
  if (!row || row.used_at || row.disabled_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppError("Ogiltig eller utgången länk", 400, "invalid_reset_token");
  }

  await getPool().query(
    `UPDATE admin_users
     SET password_hash = $2, password_changed_at = now(), updated_at = now()
     WHERE id = $1`,
    [row.admin_user_id, passwordHash],
  );
  await getPool().query(
    `UPDATE admin_password_reset_tokens
     SET used_at = now()
     WHERE admin_user_id = $1 AND used_at IS NULL`,
    [row.admin_user_id],
  );

  const updated = await getAdminUserById(row.admin_user_id);
  if (!updated) {
    throw new AppError("Ogiltig eller utgången länk", 400, "invalid_reset_token");
  }
  return updated;
}
