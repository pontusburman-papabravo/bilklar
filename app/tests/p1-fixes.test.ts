import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { getJourneyAccess } from "../src/services/authorization.js";
import { createJourneyForStudent } from "../src/services/journeys.js";
import {
  acceptInvitation,
  createInvitation,
} from "../src/services/invitations.js";
import {
  createDriveWithFocus,
  driveHasSupervisorRating,
  endDrive,
  getActiveDrive,
} from "../src/services/drives.js";
import { saveDriveObservations } from "../src/services/observations.js";
import { recommendNextFocus } from "../src/services/recommendations.js";
import { AppError } from "../src/errors.js";
import { resetDatabaseData } from "./setup.js";

async function setupJourneyWithSupervisors(
  studentName: string,
  supervisorNames: string[],
) {
  const { journey, userId: studentId } = await createJourneyForStudent(studentName);
  const supervisors: { name: string; userId: string }[] = [];

  for (const name of supervisorNames) {
    const invitation = await createInvitation(journey.id, studentId);
    const accepted = await acceptInvitation(invitation.token, name, null);
    supervisors.push({ name, userId: accepted.userId });
  }

  return { journey, studentId, supervisors };
}

async function skillIds(count: number): Promise<string[]> {
  const result = await getPool().query(
    `SELECT id FROM skills ORDER BY skill_key LIMIT $1`,
    [count],
  );
  return result.rows.map((row) => row.id);
}

describe("P1 fixes", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("P1.1 drive focus does not create training focus items", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );

    const ids = await skillIds(2);
    const { drive } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, drive.id, studentId);
    await saveDriveObservations(journey.id, drive.id, supervisors[0].userId, [
      { skillId: ids[0], assessment: "needs_help" },
      { skillId: ids[1], assessment: "with_support" },
    ]);

    const trainingFocus = await getPool().query(
      `SELECT count(*)::int AS count FROM training_focus_items WHERE journey_id = $1`,
      [journey.id],
    );
    assert.equal(trainingFocus.rows[0].count, 0);

    const driveFocus = await getPool().query(
      `SELECT training_focus_item_id FROM drive_focus_skills WHERE drive_id = $1`,
      [drive.id],
    );
    assert.ok(driveFocus.rows.every((row) => row.training_focus_item_id === null));

    const recommendations = await recommendNextFocus(journey.id);
    const needsHelpIndex = recommendations.findIndex((r) => r.skillId === ids[0]);
    const withSupportIndex = recommendations.findIndex((r) => r.skillId === ids[1]);
    assert.ok(needsHelpIndex >= 0);
    assert.ok(withSupportIndex >= 0);
    assert.ok(needsHelpIndex < withSupportIndex);
    assert.equal(recommendations[needsHelpIndex].reason, "needs_help");
    assert.equal(recommendations[withSupportIndex].reason, "with_support");
  });

  it("P1.2 supervisor who starts drive is drive.supervisor_user_id", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik", "Karin"],
    );
    const [erik, karin] = supervisors;
    const ids = await skillIds(2);

    const { drive } = await createDriveWithFocus(journey.id, karin.userId, ids);
    assert.equal(drive.supervisorUserId, karin.userId);

    await endDrive(journey.id, drive.id, studentId);
    await saveDriveObservations(journey.id, drive.id, karin.userId, [
      { skillId: ids[0], assessment: "with_support" },
      { skillId: ids[1], assessment: "with_support" },
    ]);

    await assert.rejects(async () => {
      await saveDriveObservations(journey.id, drive.id, erik.userId, [
        { skillId: ids[0], assessment: "needs_help" },
        { skillId: ids[1], assessment: "needs_help" },
      ]);
    });
  });

  it("P1.2 student with two supervisors must select supervisor", async () => {
    const { journey, studentId } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik", "Karin"],
    );
    const ids = await skillIds(2);

    await assert.rejects(
      () => createDriveWithFocus(journey.id, studentId, ids),
      (error: Error) =>
        error instanceof AppError && error.code === "supervisor_required",
    );
  });

  it("P1.2 student can start drive with explicit supervisor selection", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik", "Karin"],
    );
    const ids = await skillIds(2);

    const { drive } = await createDriveWithFocus(
      journey.id,
      studentId,
      ids,
      supervisors[1].userId,
    );
    assert.equal(drive.supervisorUserId, supervisors[1].userId);
  });

  it("P1.3 driving_instructor is not treated as supervisor", async () => {
    const { journey, userId: studentId } = await createJourneyForStudent("Anna");
    const instructor = await getPool().query(
      `INSERT INTO users (display_name, account_state) VALUES ('Instruktör', 'guest') RETURNING id`,
    );
    const instructorId = instructor.rows[0].id;

    await getPool().query(
      `INSERT INTO journey_collaborators (journey_id, user_id, role, status)
       VALUES ($1, $2, 'driving_instructor', 'active')`,
      [journey.id, instructorId],
    );

    const access = await getJourneyAccess(journey.id, instructorId);
    assert.equal(access, null);
  });

  it("P1.4 invalid assessment saves zero observations", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(2);
    const { drive } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, drive.id, studentId);

    await assert.rejects(async () => {
      await saveDriveObservations(journey.id, drive.id, supervisors[0].userId, [
        { skillId: ids[0], assessment: "needs_help" as "needs_help" },
        { skillId: ids[1], assessment: "invalid" as "needs_help" },
      ]);
    });

    const count = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_observations WHERE drive_id = $1`,
      [drive.id],
    );
    assert.equal(count.rows[0].count, 0);
  });

  it("P1.4 invalid skill in payload saves zero observations", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(2);
    const { drive } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, drive.id, studentId);

    const extraSkill = await getPool().query(
      `SELECT id FROM skills ORDER BY skill_key OFFSET 5 LIMIT 1`,
    );

    await assert.rejects(async () => {
      await saveDriveObservations(journey.id, drive.id, supervisors[0].userId, [
        { skillId: ids[0], assessment: "needs_help" },
        { skillId: extraSkill.rows[0].id, assessment: "with_support" },
      ]);
    });

    const count = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_observations WHERE drive_id = $1`,
      [drive.id],
    );
    assert.equal(count.rows[0].count, 0);
  });

  it("P1.4 duplicate submit does not create duplicate observations", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(2);
    const { drive } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, drive.id, studentId);

    const payload = [
      { skillId: ids[0], assessment: "needs_help" as const },
      { skillId: ids[1], assessment: "with_support" as const },
    ];
    await saveDriveObservations(journey.id, drive.id, supervisors[0].userId, payload);

    await assert.rejects(
      () => saveDriveObservations(journey.id, drive.id, supervisors[0].userId, payload),
      (error: Error) =>
        error instanceof AppError && error.code === "already_rated",
    );

    const count = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_observations WHERE drive_id = $1`,
      [drive.id],
    );
    assert.equal(count.rows[0].count, 2);
    assert.equal(await driveHasSupervisorRating(journey.id, drive.id), true);
  });

  it("P1.4 complete valid rating saves all observations atomically", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(3);
    const { drive } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, drive.id, studentId);

    await saveDriveObservations(journey.id, drive.id, supervisors[0].userId, [
      { skillId: ids[0], assessment: "needs_help" },
      { skillId: ids[1], assessment: "with_support" },
      { skillId: ids[2], assessment: "independent" },
    ]);

    const obs = await getPool().query(
      `SELECT skill_id, assessment FROM drive_observations
       WHERE drive_id = $1 ORDER BY created_at`,
      [drive.id],
    );
    assert.equal(obs.rowCount, 3);
  });

  it("P1.5 rejects second active drive on same journey", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(2);

    await createDriveWithFocus(journey.id, studentId, ids);
    assert.ok(await getActiveDrive(journey.id));

    await assert.rejects(
      () => createDriveWithFocus(journey.id, studentId, ids),
      (error: Error) =>
        error instanceof AppError && error.code === "active_drive_exists",
    );
  });

  it("P1.5 allows new drive after previous drive ended", async () => {
    const { journey, studentId, supervisors } = await setupJourneyWithSupervisors(
      "Anna",
      ["Erik"],
    );
    const ids = await skillIds(2);

    const { drive: first } = await createDriveWithFocus(journey.id, studentId, ids);
    await endDrive(journey.id, first.id, studentId);
    assert.equal(await getActiveDrive(journey.id), null);

    const { drive: second } = await createDriveWithFocus(journey.id, studentId, ids);
    assert.notEqual(second.id, first.id);
    assert.ok(await getActiveDrive(journey.id));
  });
});
