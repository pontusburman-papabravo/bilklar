import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createAdminToken } from "../src/auth/admin.js";
import { saveInterestSignup } from "../src/services/interest.js";
import { createTestApp } from "./helpers.js";
import { formBody } from "./http-helpers.js";
import { resetDatabaseData } from "./setup.js";

function withAdminPassword(password: string): () => void {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = password;
  return () => {
    if (previous === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previous;
  };
}

describe("waitlist admin", () => {
  beforeEach(async () => {
    await resetDatabaseData();
    delete process.env.ADMIN_PASSWORD;
  });

  it("hides admin when no password is configured", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/admin" });
    assert.equal(response.statusCode, 404);
    assert.match(response.body, /Sidan finns inte/);
    await app.close();
  });

  it("rejects a wrong password and accepts the configured one", async () => {
    const restore = withAdminPassword("beta-admin-secret");
    try {
      const app = await createTestApp();
      const denied = await app.inject({
        method: "POST",
        url: "/admin/login",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        payload: formBody({ password: "nope" }),
      });
      assert.equal(denied.statusCode, 401);
      assert.match(denied.body, /Fel lösenord/);

      const ok = await app.inject({
        method: "POST",
        url: "/admin/login",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        payload: formBody({ password: "beta-admin-secret" }),
      });
      assert.equal(ok.statusCode, 302);
      assert.equal(ok.headers.location, "/admin/signups");
      const cookie = ok.cookies.find((item) => item.name === "korpasset_admin");
      assert.ok(cookie);
      assert.equal(cookie.httpOnly, true);
      await app.close();
    } finally {
      restore();
    }
  });

  it("lists signups and can update status", async () => {
    const restore = withAdminPassword("beta-admin-secret");
    try {
      await saveInterestSignup({
        name: "Björn",
        email: "bjorn@example.com",
        role: "student",
        city: "Umeå",
        message: "Kört två månader",
      });
      const app = await createTestApp();
      const token = createAdminToken();
      const list = await app.inject({
        method: "GET",
        url: "/admin/signups",
        cookies: { korpasset_admin: token },
      });
      assert.equal(list.statusCode, 200);
      assert.match(list.body, /Björn/);
      assert.match(list.body, /bjorn@example.com/);
      assert.match(list.body, /1 nya/);

      const idMatch = list.body.match(/\/admin\/signups\/([0-9a-f-]{36})/);
      assert.ok(idMatch);
      const id = idMatch[1];

      const saved = await app.inject({
        method: "POST",
        url: `/admin/signups/${id}`,
        cookies: { korpasset_admin: token },
        headers: { "content-type": "application/x-www-form-urlencoded" },
        payload: formBody({
          status: "contacted",
          admin_note: "Mejlade 17 sep",
        }),
      });
      assert.equal(saved.statusCode, 302);

      const detail = await app.inject({
        method: "GET",
        url: `/admin/signups/${id}`,
        cookies: { korpasset_admin: token },
      });
      assert.match(detail.body, /Kontaktad/);
      assert.match(detail.body, /Mejlade 17 sep/);

      const csv = await app.inject({
        method: "GET",
        url: "/admin/signups.csv",
        cookies: { korpasset_admin: token },
      });
      assert.equal(csv.statusCode, 200);
      assert.match(csv.body, /bjorn@example.com/);
      assert.match(csv.body, /contacted/);
      await app.close();
    } finally {
      restore();
    }
  });
});
