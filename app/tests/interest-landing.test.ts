import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { createTestApp } from "./helpers.js";
import { formBody } from "./http-helpers.js";
import { resetDatabaseData } from "./setup.js";

describe("landing and interest waitlist", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("serves the marketing homepage to anonymous visitors", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Övningskör med en plan/);
    assert.match(response.body, /Bli betatestare/);
    assert.match(response.body, /Pappa vet vad mamma övade på sist/);
    assert.match(response.body, /Skicka intresseanmälan/);
    assert.match(response.body, /integritetspolicyn/);
    await app.close();
  });

  it("keeps product onboarding available", async () => {
    const app = await createTestApp();
    const onboarding = await app.inject({ method: "GET", url: "/onboarding" });
    assert.equal(onboarding.statusCode, 200);
    assert.match(onboarding.body, /Starta min körkortsresa/);
    await app.close();
  });

  it("publishes legal pages", async () => {
    const app = await createTestApp();
    const privacy = await app.inject({ method: "GET", url: "/integritet" });
    const terms = await app.inject({ method: "GET", url: "/villkor" });
    const contact = await app.inject({ method: "GET", url: "/kontakt" });
    assert.equal(privacy.statusCode, 200);
    assert.match(privacy.body, /personuppgiftsansvarig/i);
    assert.equal(terms.statusCode, 200);
    assert.match(terms.body, /gratis/i);
    assert.equal(contact.statusCode, 200);
    assert.match(contact.body, /intresseanmälan/);
    await app.close();
  });

  it("stores an interest signup and thanks the visitor", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        name: "Anna Andersson",
        email: "Anna@Example.com",
        role: "parent",
        city: "Uppsala",
        message: "Elev + två handledare",
        consent: "yes",
      }),
    });
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, "/interest/tack");

    const thanks = await app.inject({ method: "GET", url: "/interest/tack" });
    assert.match(thanks.body, /Tack — vi hör av oss/);

    const rows = await getPool().query(
      `SELECT name, email, email_normalized, role, city, message, status
       FROM interest_signups`,
    );
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].email_normalized, "anna@example.com");
    assert.equal(rows.rows[0].role, "parent");
    assert.equal(rows.rows[0].status, "new");
    await app.close();
  });

  it("requires consent and a valid email", async () => {
    const app = await createTestApp();
    const missingConsent = await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        name: "Anna",
        email: "anna@example.com",
        role: "parent",
        consent: "",
      }),
    });
    assert.equal(missingConsent.statusCode, 400);
    assert.match(missingConsent.body, /Bekräfta att du vill bli kontaktad/);

    const badEmail = await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        name: "Anna",
        email: "inte-en-epost",
        role: "parent",
        consent: "yes",
      }),
    });
    assert.equal(badEmail.statusCode, 400);
    assert.match(badEmail.body, /giltig e-postadress/);

    const count = await getPool().query(`SELECT count(*)::int AS n FROM interest_signups`);
    assert.equal(count.rows[0].n, 0);
    await app.close();
  });

  it("updates an existing email instead of creating a duplicate", async () => {
    const app = await createTestApp();
    const payload = {
      name: "Anna",
      email: "anna@example.com",
      role: "parent",
      consent: "yes",
    };
    await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody(payload),
    });
    const second = await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        ...payload,
        name: "Anna A",
        role: "supervisor",
        city: "Lund",
      }),
    });
    assert.equal(second.statusCode, 302);
    const rows = await getPool().query(`SELECT name, role, city FROM interest_signups`);
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].name, "Anna A");
    assert.equal(rows.rows[0].role, "supervisor");
    assert.equal(rows.rows[0].city, "Lund");
    await app.close();
  });

  it("ignores honeypot spam without storing a row", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/interest",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({
        name: "Bot",
        email: "bot@example.com",
        role: "other",
        website: "https://spam.test",
        consent: "yes",
      }),
    });
    assert.equal(response.statusCode, 302);
    const count = await getPool().query(`SELECT count(*)::int AS n FROM interest_signups`);
    assert.equal(count.rows[0].n, 0);
    await app.close();
  });
});
