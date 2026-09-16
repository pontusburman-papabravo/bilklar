import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getPool } from "../src/db/pool.js";
import { getJourneyAccess } from "../src/services/authorization.js";
import {
  acceptInvitation,
  createInvitation,
} from "../src/services/invitations.js";
import {
  listAccessibleActiveJourneys,
  listActiveSupervisors,
} from "../src/services/journeys.js";
import { createJourneyForStudent } from "../src/services/journeys.js";
import { resetDatabaseData } from "./setup.js";

async function seedRatedDrive() {
  const student = await createJourneyForStudent("Ella");
  const invitation = await createInvitation(student.journey.id, student.userId);
  const supervisor = await acceptInvitation(invitation.token, "Pappa", null);

  await getPool().query(
    `INSERT INTO auth_identities (user_id, provider, provider_subject)
     VALUES ($1, 'email_magic_link', 'pappa@example.com')`,
    [supervisor.userId],
  );

  const skill = await getPool().query(
    `SELECT id FROM skills ORDER BY skill_key LIMIT 1`,
  );
  const skillId = skill.rows[0].id as string;

  const drive = await getPool().query(
    `INSERT INTO drives (journey_id, started_by_user_id, supervisor_user_id, ended_at)
     VALUES ($1, $2, $3, now())
     RETURNING id`,
    [student.journey.id, student.userId, supervisor.userId],
  );
  const driveId = drive.rows[0].id as string;

  const observation = await getPool().query(
    `INSERT INTO drive_observations (
       journey_id, drive_id, skill_id, observer_user_id, source_type, assessment
     )
     VALUES ($1, $2, $3, $4, 'supervisor', 'with_support')
     RETURNING id`,
    [student.journey.id, driveId, skillId, supervisor.userId],
  );

  return {
    journeyId: student.journey.id,
    studentId: student.userId,
    supervisorId: supervisor.userId,
    driveId,
    observationId: observation.rows[0].id as string,
  };
}

describe("account lifecycle / tombstoning invariants", () => {
  beforeEach(async () => {
    await resetDatabaseData();
  });

  it("blocks hard DELETE of a student who owns a journey", async () => {
    const { userId } = await createJourneyForStudent("Ella");
    await assert.rejects(
      () => getPool().query(`DELETE FROM users WHERE id = $1`, [userId]),
      (error: Error) => /violates foreign key constraint/i.test(error.message),
    );
  });

  it("blocks hard DELETE of a supervisor with historical drives and observations", async () => {
    const seeded = await seedRatedDrive();
    await assert.rejects(
      () => getPool().query(`DELETE FROM users WHERE id = $1`, [seeded.supervisorId]),
      (error: Error) => /violates foreign key constraint/i.test(error.message),
    );

    const observations = await getPool().query(
      `SELECT count(*)::int AS count FROM drive_observations WHERE id = $1`,
      [seeded.observationId],
    );
    assert.equal(observations.rows[0].count, 1);
  });

  it("rejects SET NULL on supervisor observer_user_id because of source CHECK", async () => {
    const seeded = await seedRatedDrive();
    await assert.rejects(
      () =>
        getPool().query(
          `UPDATE drive_observations SET observer_user_id = NULL WHERE id = $1`,
          [seeded.observationId],
        ),
      (error: Error) => /violates check constraint/i.test(error.message),
    );
  });

  it("tombstones a supervisor without deleting the student journey or ledger", async () => {
    const seeded = await seedRatedDrive();

    await getPool().query(
      `DELETE FROM auth_identities WHERE user_id = $1`,
      [seeded.supervisorId],
    );
    await getPool().query(
      `UPDATE journey_collaborators
       SET status = 'removed', updated_at = now()
       WHERE user_id = $1 AND status = 'active'`,
      [seeded.supervisorId],
    );
    await getPool().query(
      `UPDATE users
       SET account_state = 'deleted',
           display_name = NULL,
           updated_at = now()
       WHERE id = $1`,
      [seeded.supervisorId],
    );

    const user = await getPool().query(
      `SELECT account_state, display_name FROM users WHERE id = $1`,
      [seeded.supervisorId],
    );
    assert.equal(user.rows[0].account_state, "deleted");
    assert.equal(user.rows[0].display_name, null);

    const identities = await getPool().query(
      `SELECT count(*)::int AS count FROM auth_identities WHERE user_id = $1`,
      [seeded.supervisorId],
    );
    assert.equal(identities.rows[0].count, 0);

    const journey = await getPool().query(
      `SELECT student_user_id, status FROM driving_journeys WHERE id = $1`,
      [seeded.journeyId],
    );
    assert.equal(journey.rows[0].student_user_id, seeded.studentId);
    assert.equal(journey.rows[0].status, "active");

    const observation = await getPool().query(
      `SELECT observer_user_id, source_type, assessment
       FROM drive_observations WHERE id = $1`,
      [seeded.observationId],
    );
    assert.equal(observation.rows[0].observer_user_id, seeded.supervisorId);
    assert.equal(observation.rows[0].source_type, "supervisor");
    assert.equal(observation.rows[0].assessment, "with_support");

    const drive = await getPool().query(
      `SELECT supervisor_user_id FROM drives WHERE id = $1`,
      [seeded.driveId],
    );
    assert.equal(drive.rows[0].supervisor_user_id, seeded.supervisorId);

    assert.equal((await listAccessibleActiveJourneys(seeded.supervisorId)).length, 0);
    assert.equal((await listActiveSupervisors(seeded.journeyId)).length, 0);
    assert.equal(await getJourneyAccess(seeded.journeyId, seeded.supervisorId), null);
    assert.ok(await getJourneyAccess(seeded.journeyId, seeded.studentId));
  });

  it("treats account_state=deleted supervisor as inactive even if collab row remains active", async () => {
    const seeded = await seedRatedDrive();
    await getPool().query(
      `UPDATE users SET account_state = 'deleted', display_name = NULL WHERE id = $1`,
      [seeded.supervisorId],
    );

    assert.equal((await listAccessibleActiveJourneys(seeded.supervisorId)).length, 0);
    assert.equal((await listActiveSupervisors(seeded.journeyId)).length, 0);
    assert.equal(await getJourneyAccess(seeded.journeyId, seeded.supervisorId), null);

    const observation = await getPool().query(
      `SELECT observer_user_id FROM drive_observations WHERE id = $1`,
      [seeded.observationId],
    );
    assert.equal(observation.rows[0].observer_user_id, seeded.supervisorId);
  });
});
