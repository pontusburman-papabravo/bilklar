import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { createAdminToken } from "../src/auth/admin.js";
import {
  ADMIN_RESET_NEUTRAL_MESSAGE,
  createAdminUser,
} from "../src/services/admin-users.js";
import { type OutboundEmail, setMailerForTests } from "../src/services/email.js";
import { createTestApp } from "./helpers.js";
import { formBody } from "./http-helpers.js";
import { resetDatabaseData } from "./setup.js";

const EMAIL = "ops@korpasset.se";
const PASSWORD = "korrekt-losen-12";
const NEW_PASSWORD = "nytt-losenord-99";

function tokenFromEmail(email: OutboundEmail): string {
  const match = email.text.match(/reset-password\?token=([^\s]+)/);
  assert.ok(match, "reset token missing from email");
  return decodeURIComponent(match[1]);
}

describe("admin authentication", () => {
  const sent: OutboundEmail[] = [];

  beforeEach(async () => {
    await resetDatabaseData();
    sent.length = 0;
    setMailerForTests({
      async send(email) {
        sent.push(email);
      },
    });
  });

  afterEach(() => {
    setMailerForTests(null);
  });

  it("accepts a correct login and rejects a wrong password or unknown email", async () => {
    await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();

    const unknown = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: "missing@korpasset.se", password: PASSWORD }),
    });
    assert.equal(unknown.statusCode, 401);
    assert.match(unknown.body, /Fel e-post eller lösenord/);
    assert.equal(unknown.cookies.some((item) => item.name === "korpasset_admin"), false);

    const wrong = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL, password: "fel-losenord-12" }),
    });
    assert.equal(wrong.statusCode, 401);
    assert.equal(wrong.body.includes("Fel e-post eller lösenord"), true);

    const ok = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(ok.statusCode, 302);
    assert.equal(ok.headers.location, "/admin/signups");
    const cookie = ok.cookies.find((item) => item.name === "korpasset_admin");
    assert.ok(cookie);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.path, "/admin");
    assert.match(String(cookie.sameSite), /lax/i);
    await app.close();
  });

  it("blocks a disabled admin from logging in or using an old cookie", async () => {
    const disabled = await createAdminUser(EMAIL, PASSWORD);
    await createAdminUser("other@korpasset.se", PASSWORD);
    await getPool().query(`UPDATE admin_users SET disabled_at = now() WHERE id = $1`, [disabled.id]);
    const app = await createTestApp();
    const denied = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(denied.statusCode, 401);

    const stale = await app.inject({
      method: "GET",
      url: "/admin/signups",
      cookies: { korpasset_admin: createAdminToken(disabled.id) },
    });
    assert.equal(stale.statusCode, 302);
    assert.equal(stale.headers.location, "/admin/login");
    await app.close();
  });

  it("logs out and protects waitlist routes", async () => {
    const admin = await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();
    const token = createAdminToken(admin.id);
    const listed = await app.inject({
      method: "GET",
      url: "/admin/signups",
      cookies: { korpasset_admin: token },
    });
    assert.equal(listed.statusCode, 200);

    const logout = await app.inject({
      method: "POST",
      url: "/admin/logout",
      cookies: { korpasset_admin: token },
    });
    assert.equal(logout.statusCode, 302);
    const cleared = logout.cookies.find((item) => item.name === "korpasset_admin");
    assert.ok(cleared);
    assert.equal(cleared.value, "");

    const blocked = await app.inject({ method: "GET", url: "/admin/signups" });
    assert.equal(blocked.statusCode, 302);
    assert.equal(blocked.headers.location, "/admin/login");
    await app.close();
  });

  it("returns the same public reset message for known and unknown emails", async () => {
    await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();
    const known = await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL }),
    });
    const unknown = await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: "nobody@korpasset.se" }),
    });
    assert.equal(known.statusCode, 200);
    assert.equal(unknown.statusCode, 200);
    assert.match(known.body, new RegExp(ADMIN_RESET_NEUTRAL_MESSAGE));
    assert.match(unknown.body, new RegExp(ADMIN_RESET_NEUTRAL_MESSAGE));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, EMAIL);
    assert.match(sent[0].subject, /Återställ lösenordet till Körpasset/);
    assert.doesNotMatch(known.body, /token=/);
    await app.close();
  });

  it("stores only the hash of a reset token", async () => {
    await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();
    await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL }),
    });
    const raw = tokenFromEmail(sent[0]);
    const hashed = createHash("sha256").update(raw).digest("hex");
    const row = await getPool().query(`SELECT token_hash FROM admin_password_reset_tokens`);
    assert.equal(row.rowCount, 1);
    assert.equal(row.rows[0].token_hash, hashed);
    assert.notEqual(row.rows[0].token_hash, raw);
    await app.close();
  });

  it("resets the password with a valid token and invalidates the old one", async () => {
    const admin = await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();
    await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL }),
    });
    const raw = tokenFromEmail(sent[0]);
    const oldCookie = createAdminToken(admin.id);

    const reset = await app.inject({
      method: "POST",
      url: "/admin/reset-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ token: raw, password: NEW_PASSWORD, confirm: NEW_PASSWORD }),
    });
    assert.equal(reset.statusCode, 302);
    assert.equal(reset.headers.location, "/admin/login?reset=1");

    const oldLogin = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(oldLogin.statusCode, 401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/admin/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL, password: NEW_PASSWORD }),
    });
    assert.equal(newLogin.statusCode, 302);

    const reused = await app.inject({
      method: "POST",
      url: "/admin/reset-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ token: raw, password: "tredje-losen-12", confirm: "tredje-losen-12" }),
    });
    assert.equal(reused.statusCode, 400);

    const staleSession = await app.inject({
      method: "GET",
      url: "/admin/signups",
      cookies: { korpasset_admin: oldCookie },
    });
    assert.equal(staleSession.statusCode, 302);
    await app.close();
  });

  it("rejects expired, random, and mismatched reset attempts", async () => {
    await createAdminUser(EMAIL, PASSWORD);
    const app = await createTestApp();
    await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL }),
    });
    const raw = tokenFromEmail(sent[0]);
    await getPool().query(
      `UPDATE admin_password_reset_tokens SET expires_at = now() - interval '1 minute'`,
    );

    const expired = await app.inject({
      method: "POST",
      url: "/admin/reset-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ token: raw, password: NEW_PASSWORD, confirm: NEW_PASSWORD }),
    });
    assert.equal(expired.statusCode, 400);
    assert.match(expired.body, /Ogiltig eller utgången länk/);

    const random = await app.inject({
      method: "POST",
      url: "/admin/reset-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        token: "not-a-real-token",
        password: NEW_PASSWORD,
        confirm: NEW_PASSWORD,
      }),
    });
    assert.equal(random.statusCode, 400);

    const mismatch = await app.inject({
      method: "POST",
      url: "/admin/reset-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ token: raw, password: NEW_PASSWORD, confirm: "annat-losen-12" }),
    });
    assert.equal(mismatch.statusCode, 400);
    await app.close();
  });

  it("does not claim success details when sending mail fails", async () => {
    await createAdminUser(EMAIL, PASSWORD);
    setMailerForTests({
      async send() {
        throw new Error("resend down");
      },
    });
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/admin/forgot-password",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ email: EMAIL }),
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, new RegExp(ADMIN_RESET_NEUTRAL_MESSAGE));
    assert.doesNotMatch(response.body, /resend/i);
    const tokens = await getPool().query(`SELECT count(*)::int AS n FROM admin_password_reset_tokens`);
    assert.equal(tokens.rows[0].n, 1);
    await app.close();
  });

  it("builds the reset URL from APP_BASE_URL, not the Host header", async () => {
    const previous = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://korpasset.se";
    try {
      await createAdminUser(EMAIL, PASSWORD);
      const app = await createTestApp();
      await app.inject({
        method: "POST",
        url: "/admin/forgot-password",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          host: "evil.example",
        },
        payload: formBody({ email: EMAIL }),
      });
      assert.equal(sent.length, 1);
      assert.match(sent[0].text, /https:\/\/korpasset\.se\/admin\/reset-password\?token=/);
      assert.doesNotMatch(sent[0].text, /evil\.example/);
      await app.close();
    } finally {
      if (previous === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previous;
    }
  });
});
