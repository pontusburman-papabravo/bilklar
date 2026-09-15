import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { createSessionToken } from "../src/auth/session.js";
import { createJourneyForStudent } from "../src/services/journeys.js";
import {
  acceptInvitation,
  createInvitation,
} from "../src/services/invitations.js";
import { resolveHomeJourneyId } from "../src/services/journeys.js";
import { createGuestUser } from "../src/services/users.js";
import { createTestApp } from "./helpers.js";
import { injectWithSession } from "./http-helpers.js";
import { resetDatabaseData } from "./setup.js";

describe("root navigation (GET /)", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("redirects student to own journey", async () => {
    const app = await createTestApp();
    const { journey, userId } = await createJourneyForStudent("Ella");

    const response = await injectWithSession(app, {
      bilklar_session: createSessionToken(userId),
    }, {
      method: "GET",
      url: "/",
    });

    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, `/journey/${journey.id}`);
    await app.close();
  });

  it("redirects supervisor with one active collaboration to supervised journey", async () => {
    const app = await createTestApp();
    const { journey, userId: studentId } = await createJourneyForStudent("Ella");
    const invitation = await createInvitation(journey.id, studentId);
    const accepted = await acceptInvitation(invitation.token, "Pappa", null);

    const response = await injectWithSession(app, {
      bilklar_session: createSessionToken(accepted.userId),
    }, {
      method: "GET",
      url: "/",
    });

    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, `/journey/${journey.id}`);
    await app.close();
  });

  it("shows onboarding for fresh user without session", async () => {
    const app = await createTestApp();

    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Vad heter du/);
    assert.match(response.body, /Starta min körkortsresa/);
    await app.close();
  });

  it("does not redirect inactive collaborator", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Ella");
    const supervisor = await createGuestUser("Pappa");

    await getPool().query(
      `INSERT INTO journey_collaborators (journey_id, user_id, role, status)
       VALUES ($1, $2, 'supervisor', 'removed')`,
      [journey.id, supervisor.id],
    );

    const journeyId = await resolveHomeJourneyId(supervisor.id);
    assert.equal(journeyId, null);

    const app = await createTestApp();
    const response = await injectWithSession(app, {
      bilklar_session: createSessionToken(supervisor.id),
    }, {
      method: "GET",
      url: "/",
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Vad heter du/);
    await app.close();
  });

  it("does not count driving_instructor as supervisor for home redirect", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Ella");
    const instructor = await createGuestUser("Instruktör");

    await getPool().query(
      `INSERT INTO journey_collaborators (journey_id, user_id, role, status)
       VALUES ($1, $2, 'driving_instructor', 'active')`,
      [journey.id, instructor.id],
    );

    const journeyId = await resolveHomeJourneyId(instructor.id);
    assert.equal(journeyId, null);

    const app = await createTestApp();
    const response = await injectWithSession(app, {
      bilklar_session: createSessionToken(instructor.id),
    }, {
      method: "GET",
      url: "/",
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Vad heter du/);
    await app.close();
  });
});
