import type pg from "pg";
import { AppError, ForbiddenError, NotFoundError } from "../errors.js";
import { getPool, withTransaction } from "../db/pool.js";
import {
  requireActiveSupervisor,
  requireJourneyAccess,
} from "./authorization.js";
import type { SkillWithDefinition } from "./skills.js";
import { getSkillsByIds } from "./skills.js";

export interface Drive {
  id: string;
  journeyId: string;
  startedByUserId: string;
  supervisorUserId: string;
  startedAt: Date;
  endedAt: Date | null;
}

export async function createDriveWithFocus(
  journeyId: string,
  userId: string,
  skillIds: string[],
): Promise<{ drive: Drive; focusSkills: SkillWithDefinition[] }> {
  if (skillIds.length < 2 || skillIds.length > 3) {
    throw new AppError("Select 2–3 skills for drive focus");
  }

  const uniqueSkillIds = [...new Set(skillIds)];
  if (uniqueSkillIds.length !== skillIds.length) {
    throw new AppError("Duplicate skills are not allowed");
  }

  await requireJourneyAccess(journeyId, userId);

  const supervisors = await getPool().query(
    `SELECT user_id FROM journey_collaborators
     WHERE journey_id = $1 AND role = 'supervisor' AND status = 'active'
     ORDER BY created_at
     LIMIT 1`,
    [journeyId],
  );
  if (supervisors.rowCount === 0) {
    throw new AppError("An active supervisor is required before starting a drive");
  }
  const supervisorUserId = supervisors.rows[0].user_id;

  const skills = await getSkillsByIds(uniqueSkillIds, journeyId);
  if (skills.length !== uniqueSkillIds.length) {
    throw new AppError("One or more skills are invalid");
  }

  return withTransaction(async (client) => {
    const driveResult = await client.query(
      `INSERT INTO drives (
         journey_id, started_by_user_id, supervisor_user_id,
         environment, light_condition, weather_condition, traffic_level
       )
       VALUES ($1, $2, $3, '{}', NULL, NULL, NULL)
       RETURNING id, journey_id, started_by_user_id, supervisor_user_id,
                 started_at, ended_at`,
      [journeyId, userId, supervisorUserId],
    );
    const driveRow = driveResult.rows[0];
    const driveId = driveRow.id;

    for (const skill of skills) {
      const focusItemResult = await client.query(
        `INSERT INTO training_focus_items (journey_id, skill_id, source, status)
         VALUES ($1, $2, 'student', 'active')
         RETURNING id`,
        [journeyId, skill.skillId],
      );
      const focusItemId = focusItemResult.rows[0].id;

      await client.query(
        `INSERT INTO drive_focus_skills (
           drive_id, journey_id, skill_id, training_focus_item_id
         )
         VALUES ($1, $2, $3, $4)`,
        [driveId, journeyId, skill.skillId, focusItemId],
      );
    }

    return {
      drive: {
        id: driveRow.id,
        journeyId: driveRow.journey_id,
        startedByUserId: driveRow.started_by_user_id,
        supervisorUserId: driveRow.supervisor_user_id,
        startedAt: driveRow.started_at,
        endedAt: driveRow.ended_at,
      },
      focusSkills: skills,
    };
  });
}

export async function getDrive(
  journeyId: string,
  driveId: string,
  userId: string,
  client?: pg.PoolClient,
): Promise<Drive | null> {
  await requireJourneyAccess(journeyId, userId, client);
  const db = client ?? getPool();
  const result = await db.query(
    `SELECT id, journey_id, started_by_user_id, supervisor_user_id, started_at, ended_at
     FROM drives
     WHERE id = $1 AND journey_id = $2`,
    [driveId, journeyId],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    journeyId: row.journey_id,
    startedByUserId: row.started_by_user_id,
    supervisorUserId: row.supervisor_user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function getDriveFocusSkills(
  journeyId: string,
  driveId: string,
  userId: string,
): Promise<SkillWithDefinition[]> {
  await requireJourneyAccess(journeyId, userId);
  const result = await getPool().query(
    `SELECT s.id AS skill_id
     FROM drive_focus_skills dfs
     JOIN skills s ON s.id = dfs.skill_id
     WHERE dfs.drive_id = $1 AND dfs.journey_id = $2
     ORDER BY dfs.created_at`,
    [driveId, journeyId],
  );
  const skillIds = result.rows.map((row) => row.skill_id);
  return getSkillsByIds(skillIds, journeyId);
}

export async function endDrive(
  journeyId: string,
  driveId: string,
  userId: string,
): Promise<Drive> {
  await requireJourneyAccess(journeyId, userId);
  const result = await getPool().query(
    `UPDATE drives
     SET ended_at = now()
     WHERE id = $1 AND journey_id = $2 AND ended_at IS NULL
     RETURNING id, journey_id, started_by_user_id, supervisor_user_id,
               started_at, ended_at`,
    [driveId, journeyId],
  );
  if (result.rowCount === 0) {
    const existing = await getDrive(journeyId, driveId, userId);
    if (!existing) throw new NotFoundError("Drive not found");
    if (existing.endedAt) return existing;
    throw new AppError("Drive could not be ended");
  }
  const row = result.rows[0];
  return {
    id: row.id,
    journeyId: row.journey_id,
    startedByUserId: row.started_by_user_id,
    supervisorUserId: row.supervisor_user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function assertDriveSupervisorForObservation(
  journeyId: string,
  driveId: string,
  observerUserId: string,
  client?: pg.PoolClient,
): Promise<void> {
  const access = await requireActiveSupervisor(journeyId, observerUserId, client);
  if (access.role !== "supervisor") {
    throw new ForbiddenError("Only active supervisor can observe");
  }

  const db = client ?? getPool();
  const driveResult = await db.query(
    `SELECT supervisor_user_id FROM drives WHERE id = $1 AND journey_id = $2`,
    [driveId, journeyId],
  );
  if (driveResult.rowCount === 0) {
    throw new NotFoundError("Drive not found");
  }
  if (driveResult.rows[0].supervisor_user_id !== observerUserId) {
    throw new ForbiddenError("Wrong supervisor for this drive");
  }
}
