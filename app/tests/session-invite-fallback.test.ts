import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { createJourneyForStudent } from "../src/services/journeys.js";
import {
  acceptInvitation,
  createInvitation,
} from "../src/services/invitations.js";
import { createTestApp } from "./helpers.js";
import {
  extractInviteToken,
  formBody,
  injectWithSession,
  mergeCookies,
} from "./http-helpers.js";
import { resetDatabaseData } from "./setup.js";

async function createAcceptedInvite() {
  const app = await createTestApp();
  const start = await app.inject({
    method: "POST",
    url: "/start",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: formBody({ name: "Ella" }),
  });
  const studentCookies = mergeCookies({}, start);
  const journeyId = start.headers.location?.toString().split("/").at(-1);
  assert.ok(journeyId);

  const invitePage = await injectWithSession(app, studentCookies, {
    method: "POST",
    url: `/journey/${journeyId}/invitations`,
  });
  const token = extractInviteToken(invitePage.body);

  const accept = await app.inject({
    method: "POST",
    url: `/invite/${token}/accept`,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: formBody({ name: "Pappa" }),
  });
  const supervisorCookies = mergeCookies({}, accept);

  return { app, journeyId, token, studentCookies, supervisorCookies };
}

describe("session and invitation fallback", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("shows HTML instead of JSON when a journey URL is opened without a session", async () => {
    const { journey } = await createJourneyForStudent("Ella");
    const app = await createTestApp();
    const response = await app.inject({
      method: "GET",
      url: `/journey/${journey.id}`,
    });

    assert.equal(response.statusCode, 401);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.match(response.body, /Vi känner inte igen den här enheten/);
    assert.match(response.body, /Starta som elev/);
    assert.doesNotMatch(response.body, /"error":"Session required"/);
    await app.close();
  });

  it("still returns JSON 401 when the client asks for JSON", async () => {
    const { journey } = await createJourneyForStudent("Ella");
    const app = await createTestApp();
    const response = await app.inject({
      method: "GET",
      url: `/journey/${journey.id}`,
      headers: { accept: "application/json" },
    });
    assert.equal(response.statusCode, 401);
    assert.equal((response.json() as { error: string }).error, "Session required");
    await app.close();
  });

  it("does not send an already-accepted invite to the journey without a matching session", async () => {
    const { app, journeyId, token } = await createAcceptedInvite();

    const replay = await app.inject({
      method: "GET",
      url: `/invite/${token}`,
    });
    assert.equal(replay.statusCode, 410);
    assert.notEqual(replay.headers.location, `/journey/${journeyId}`);
    assert.match(replay.body, /Inbjudan redan använd/);
    assert.match(replay.body, /Be om en ny länk/);
    await app.close();
  });

  it("lets the accepting supervisor reopen the invite and land on the journey", async () => {
    const { app, journeyId, token, supervisorCookies } = await createAcceptedInvite();

    const replay = await injectWithSession(app, supervisorCookies, {
      method: "GET",
      url: `/invite/${token}`,
    });
    assert.equal(replay.statusCode, 302);
    assert.equal(replay.headers.location, `/journey/${journeyId}`);
    await app.close();
  });

  it("lets the student reopen the spent invite and land on the journey", async () => {
    const { app, journeyId, token, studentCookies } = await createAcceptedInvite();

    const replay = await injectWithSession(app, studentCookies, {
      method: "GET",
      url: `/invite/${token}`,
    });
    assert.equal(replay.statusCode, 302);
    assert.equal(replay.headers.location, `/journey/${journeyId}`);
    await app.close();
  });

  it("shows the used-invite page if someone POSTs accept without the original session", async () => {
    const { app, token } = await createAcceptedInvite();
    const response = await app.inject({
      method: "POST",
      url: `/invite/${token}/accept`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: formBody({ name: "Mamma" }),
    });
    assert.equal(response.statusCode, 409);
    assert.match(response.body, /Inbjudan redan använd/);
    await app.close();
  });

  it("redirects onboarding away when the session already has a journey", async () => {
    const { app, studentCookies } = await createAcceptedInvite();
    const onboarding = await injectWithSession(app, studentCookies, {
      method: "GET",
      url: "/onboarding",
    });
    assert.equal(onboarding.statusCode, 302);
    assert.equal(onboarding.headers.location, "/");
    await app.close();
  });

  it("does not mint a new user when replaying an accepted invite without a session", async () => {
    const { journey, userId } = await createJourneyForStudent("Ella");
    const invitation = await createInvitation(journey.id, userId);
    await acceptInvitation(invitation.token, "Pappa", null);

    const before = await getPool().query(`SELECT count(*)::int AS count FROM users`);
    await assert.rejects(
      () => acceptInvitation(invitation.token, "Mamma", null),
      (error: Error) => error.message.includes("already accepted"),
    );
    const after = await getPool().query(`SELECT count(*)::int AS count FROM users`);
    assert.equal(after.rows[0].count, before.rows[0].count);
  });
});
