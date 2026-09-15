import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { createJourneyForStudent } from "../src/services/journeys.js";
import {
  acceptInvitation,
  createInvitation,
} from "../src/services/invitations.js";
import {
  createDriveWithFocus,
  endDrive,
} from "../src/services/drives.js";
import { saveDriveObservations } from "../src/services/observations.js";
import { recommendNextFocus } from "../src/services/recommendations.js";
import { createGuestUser } from "../src/services/users.js";
import { ForbiddenError } from "../src/errors.js";
import { resetDatabaseData } from "./setup.js";

describe("vertical slice", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("creates journey for student", async () => {
    const { journey, userId } = await createJourneyForStudent("Anna");
    assert.ok(journey.id);
    assert.equal(journey.studentName, "Anna");
    assert.equal(journey.licenceType, "B");
    assert.equal(journey.transmissionScope, "unknown");
    assert.ok(userId);
  });

  it("creates invitation with hashed token", async () => {
    const { journey, userId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, userId);
    assert.ok(invitation.token);
    assert.match(invitation.inviteUrl, /\/invite\//);

    const hash = createHash("sha256").update(invitation.token).digest("hex");
    const stored = await getPool().query(
      `SELECT token_hash, status FROM journey_invitations WHERE id = $1`,
      [invitation.id],
    );
    assert.equal(stored.rows[0].token_hash, hash);
    assert.equal(stored.rows[0].status, "pending");
  });

  it("accepts valid invitation and creates collaborator atomically", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const result = await acceptInvitation(invitation.token, "Erik", null);

    assert.equal(result.journeyId, journey.id);
    assert.notEqual(result.userId, studentId);

    const collab = await getPool().query(
      `SELECT role, status FROM journey_collaborators
       WHERE journey_id = $1 AND user_id = $2`,
      [journey.id, result.userId],
    );
    assert.equal(collab.rowCount, 1);
    assert.equal(collab.rows[0].role, "supervisor");
    assert.equal(collab.rows[0].status, "active");

    const invite = await getPool().query(
      `SELECT status, accepted_by_user_id FROM journey_invitations WHERE id = $1`,
      [invitation.id],
    );
    assert.equal(invite.rows[0].status, "accepted");
    assert.equal(invite.rows[0].accepted_by_user_id, result.userId);
  });

  it("rejects expired invitation", async () => {
    const { journey, userId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, userId);
    await getPool().query(
      `UPDATE journey_invitations SET expires_at = now() - interval '1 hour' WHERE id = $1`,
      [invitation.id],
    );

    await assert.rejects(
      () => acceptInvitation(invitation.token, "Erik", null),
      (error: Error) => error.message.includes("expired"),
    );
  });

  it("rejects double accept replay", async () => {
    const { journey, userId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, userId);
    const first = await acceptInvitation(invitation.token, "Erik", null);
    const second = await acceptInvitation(invitation.token, "Erik", first.userId);
    assert.equal(second.alreadyAccepted, true);

    const collabCount = await getPool().query(
      `SELECT count(*)::int AS count FROM journey_collaborators WHERE journey_id = $1`,
      [journey.id],
    );
    assert.equal(collabCount.rows[0].count, 1);
  });

  it("rejects student joining own journey as supervisor", async () => {
    const { journey, userId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, userId);

    await assert.rejects(
      () => acceptInvitation(invitation.token, "Anna", userId),
      (error: Error) =>
        error instanceof ForbiddenError &&
        error.message.includes("cannot join own journey"),
    );
  });

  it("rejects cross-journey access", async () => {
    const first = await createJourneyForStudent("Anna");
    const second = await createJourneyForStudent("Bertil");

    await assert.rejects(
      () => createInvitation(second.journey.id, first.userId),
      (error: Error) => error.message.includes("Only the student"),
    );

    const invitation = await createInvitation(first.journey.id, first.userId);
    const accepted = await acceptInvitation(invitation.token, "Erik", null);

    const skills = await getPool().query(`SELECT id FROM skills ORDER BY skill_key LIMIT 2`);
    const skillIds = skills.rows.map((row) => row.id);

    await assert.rejects(
      () => createDriveWithFocus(second.journey.id, accepted.userId, skillIds),
      (error: Error) => error.message.includes("No access"),
    );
  });

  it("creates drive with nullable context and 2-3 focus skills", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const supervisor = await acceptInvitation(invitation.token, "Erik", null);

    const skills = await getPool().query(
      `SELECT id FROM skills ORDER BY skill_key LIMIT 3`,
    );
    const skillIds = skills.rows.map((row) => row.id);

    const { drive, focusSkills } = await createDriveWithFocus(
      journey.id,
      studentId,
      skillIds,
    );

    assert.equal(focusSkills.length, 3);
    assert.equal(drive.supervisorUserId, supervisor.userId);

    const driveRow = await getPool().query(
      `SELECT environment, light_condition, weather_condition, traffic_level
       FROM drives WHERE id = $1`,
      [drive.id],
    );
    const environment = driveRow.rows[0].environment;
    assert.ok(
      Array.isArray(environment)
        ? environment.length === 0
        : environment === "{}" || environment === "",
    );
    assert.equal(driveRow.rows[0].light_condition, null);
    assert.equal(driveRow.rows[0].weather_condition, null);
    assert.equal(driveRow.rows[0].traffic_level, null);

    const focusCount = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_focus_skills WHERE drive_id = $1`,
      [drive.id],
    );
    assert.equal(focusCount.rows[0].count, 3);

    const trainingFocusCount = await getPool().query(
      `SELECT count(*)::int AS count FROM training_focus_items WHERE journey_id = $1`,
      [journey.id],
    );
    assert.equal(trainingFocusCount.rows[0].count, 0);
  });

  it("allows supervisor to save observations from session actor", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const supervisor = await acceptInvitation(invitation.token, "Erik", null);

    const skills = await getPool().query(`SELECT id FROM skills ORDER BY skill_key LIMIT 2`);
    const skillIds = skills.rows.map((row) => row.id);
    const { drive } = await createDriveWithFocus(journey.id, studentId, skillIds);
    await endDrive(journey.id, drive.id, studentId);

    await saveDriveObservations(journey.id, drive.id, supervisor.userId, [
      { skillId: skillIds[0], assessment: "needs_help" },
      { skillId: skillIds[1], assessment: "with_support" },
    ]);

    const obs = await getPool().query(
      `SELECT observer_user_id, source_type, assessment
       FROM drive_observations WHERE drive_id = $1`,
      [drive.id],
    );
    assert.equal(obs.rowCount, 2);
    assert.equal(obs.rows[0].observer_user_id, supervisor.userId);
    assert.equal(obs.rows[0].source_type, "supervisor");
  });

  it("rejects wrong supervisor saving observations", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    await acceptInvitation(invitation.token, "Erik", null);
    const otherSupervisor = await createGuestUser("Karin");

    const skills = await getPool().query(`SELECT id FROM skills ORDER BY skill_key LIMIT 2`);
    const skillIds = skills.rows.map((row) => row.id);
    const { drive } = await createDriveWithFocus(journey.id, studentId, skillIds);
    await endDrive(journey.id, drive.id, studentId);

    await assert.rejects(async () => {
      await saveDriveObservations(journey.id, drive.id, otherSupervisor.id, [
        { skillId: skillIds[0], assessment: "needs_help" },
      ]);
    });
  });

  it("recommendation prefers needs_help before with_support", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const supervisor = await acceptInvitation(invitation.token, "Erik", null);

    const skills = await getPool().query(
      `SELECT s.id, s.skill_key
       FROM skills s
       ORDER BY s.skill_key
       LIMIT 2`,
    );
    const [needsHelpSkill, withSupportSkill] = skills.rows;

    const { drive } = await createDriveWithFocus(
      journey.id,
      studentId,
      [needsHelpSkill.id, withSupportSkill.id],
    );
    await endDrive(journey.id, drive.id, studentId);
    await saveDriveObservations(journey.id, drive.id, supervisor.userId, [
      { skillId: needsHelpSkill.id, assessment: "needs_help" },
      { skillId: withSupportSkill.id, assessment: "with_support" },
    ]);

    const recommendations = await recommendNextFocus(journey.id);
    const reasons = recommendations.map((rec) => rec.reason);
    const needsHelpIndex = recommendations.findIndex(
      (rec) => rec.skillId === needsHelpSkill.id,
    );
    const withSupportIndex = recommendations.findIndex(
      (rec) => rec.skillId === withSupportSkill.id,
    );

    assert.ok(needsHelpIndex >= 0);
    assert.ok(withSupportIndex >= 0);
    assert.ok(needsHelpIndex < withSupportIndex);
    assert.ok(reasons.includes("needs_help"));
    assert.ok(reasons.includes("with_support"));
  });

  it("automatic_only excludes gear shifting recommendation", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    await getPool().query(
      `UPDATE driving_journeys SET transmission_scope = 'automatic_only' WHERE id = $1`,
      [journey.id],
    );

    const gearSkill = await getPool().query(
      `SELECT id FROM skills WHERE skill_key = 'car_control_gear_shifting'`,
    );
    assert.equal(gearSkill.rowCount, 1);

    await getPool().query(
      `INSERT INTO training_focus_items (journey_id, skill_id, source, status)
       VALUES ($1, $2, 'student', 'active')`,
      [journey.id, gearSkill.rows[0].id],
    );

    const recommendations = await recommendNextFocus(journey.id);
    assert.ok(
      !recommendations.some(
        (rec) => rec.skillKey === "car_control_gear_shifting",
      ),
    );
  });

  it("ignores superseded observations in recommendations", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const supervisor = await acceptInvitation(invitation.token, "Erik", null);

    const skill = await getPool().query(
      `SELECT id FROM skills ORDER BY skill_key LIMIT 1`,
    );
    const skillId = skill.rows[0].id;

    const { drive } = await createDriveWithFocus(journey.id, studentId, [
      skillId,
      (
        await getPool().query(`SELECT id FROM skills ORDER BY skill_key OFFSET 1 LIMIT 1`)
      ).rows[0].id,
    ]);
    await endDrive(journey.id, drive.id, studentId);
    await saveDriveObservations(journey.id, drive.id, supervisor.userId, [
      { skillId, assessment: "needs_help" },
      {
        skillId: (
          await getPool().query(`SELECT id FROM skills ORDER BY skill_key OFFSET 1 LIMIT 1`)
        ).rows[0].id,
        assessment: "with_support",
      },
    ]);

    const original = await getPool().query(
      `SELECT id FROM drive_observations
       WHERE journey_id = $1 AND skill_id = $2
       ORDER BY observed_at ASC LIMIT 1`,
      [journey.id, skillId],
    );

    await getPool().query(
      `INSERT INTO drive_observations (
         journey_id, drive_id, skill_id, observer_user_id,
         source_type, assessment, supersedes_observation_id
       )
       SELECT journey_id, drive_id, skill_id, observer_user_id,
              source_type, 'independent', id
       FROM drive_observations WHERE id = $1`,
      [original.rows[0].id],
    );

    const recommendations = await recommendNextFocus(journey.id);
    assert.ok(
      !recommendations.some(
        (rec) => rec.skillId === skillId && rec.reason === "needs_help",
      ),
    );
  });

  it("complete happy-path end-to-end", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const invitation = await createInvitation(journey.id, studentId);
    const supervisor = await acceptInvitation(invitation.token, "Erik", null);

    const skills = await getPool().query(`SELECT id FROM skills ORDER BY skill_key LIMIT 2`);
    const skillIds = skills.rows.map((row) => row.id);

    const { drive } = await createDriveWithFocus(journey.id, studentId, skillIds);
    await endDrive(journey.id, drive.id, studentId);
    await saveDriveObservations(journey.id, drive.id, supervisor.userId, [
      { skillId: skillIds[0], assessment: "needs_help" },
      { skillId: skillIds[1], assessment: "with_support" },
    ]);

    const recommendations = await recommendNextFocus(journey.id);
    assert.ok(recommendations.length > 0);
    assert.equal(recommendations[0].reason, "needs_help");
    assert.equal(recommendations[0].skillId, skillIds[0]);

    const obsCount = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_observations WHERE journey_id = $1`,
      [journey.id],
    );
    assert.equal(obsCount.rows[0].count, 2);
  });
});
