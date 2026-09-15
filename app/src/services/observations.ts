import type pg from "pg";
import { AppError } from "../errors.js";
import { getPool } from "../db/pool.js";
import { assertDriveSupervisorForObservation } from "./drives.js";

export type AssessmentLevel = "needs_help" | "with_support" | "independent";

export interface ObservationInput {
  skillId: string;
  assessment: AssessmentLevel;
}

export async function saveDriveObservations(
  journeyId: string,
  driveId: string,
  observerUserId: string,
  observations: ObservationInput[],
): Promise<void> {
  if (observations.length === 0) {
    throw new AppError("At least one observation is required");
  }

  await assertDriveSupervisorForObservation(journeyId, driveId, observerUserId);

  const driveResult = await getPool().query(
    `SELECT ended_at FROM drives WHERE id = $1 AND journey_id = $2`,
    [driveId, journeyId],
  );
  if (driveResult.rowCount === 0) {
    throw new AppError("Drive not found");
  }
  if (!driveResult.rows[0].ended_at) {
    throw new AppError("Drive must be ended before rating");
  }

  const focusResult = await getPool().query(
    `SELECT skill_id FROM drive_focus_skills
     WHERE drive_id = $1 AND journey_id = $2`,
    [driveId, journeyId],
  );
  const allowedSkillIds = new Set(
    focusResult.rows.map((row) => row.skill_id as string),
  );

  for (const obs of observations) {
    if (!allowedSkillIds.has(obs.skillId)) {
      throw new AppError("Observation skill must be part of drive focus");
    }
    await getPool().query(
      `INSERT INTO drive_observations (
         journey_id, drive_id, skill_id, observer_user_id,
         source_type, assessment
       )
       VALUES ($1, $2, $3, $4, 'supervisor', $5)`,
      [journeyId, driveId, obs.skillId, observerUserId, obs.assessment],
    );
  }
}
