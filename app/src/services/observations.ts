import type pg from "pg";
import { AppError } from "../errors.js";
import { withTransaction } from "../db/pool.js";
import { assertDriveSupervisorForObservation } from "./drives.js";

export type AssessmentLevel = "needs_help" | "with_support" | "independent";

const VALID_ASSESSMENTS = new Set<AssessmentLevel>([
  "needs_help",
  "with_support",
  "independent",
]);

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
  return withTransaction(async (client) => {
    const driveResult = await client.query(
      `SELECT id, journey_id, supervisor_user_id, ended_at
       FROM drives
       WHERE id = $1 AND journey_id = $2
       FOR UPDATE`,
      [driveId, journeyId],
    );

    if (driveResult.rowCount === 0) {
      throw new AppError("Drive not found", 404);
    }

    const drive = driveResult.rows[0];
    if (!drive.ended_at) {
      throw new AppError("Drive must be ended before rating");
    }

    await assertDriveSupervisorForObservation(
      journeyId,
      driveId,
      observerUserId,
      client,
    );

    const focusResult = await client.query(
      `SELECT skill_id FROM drive_focus_skills
       WHERE drive_id = $1 AND journey_id = $2
       ORDER BY created_at`,
      [driveId, journeyId],
    );
    const focusSkillIds = focusResult.rows.map((row) => row.skill_id as string);
    const allowedSkillIds = new Set(focusSkillIds);

    if (observations.length !== focusSkillIds.length) {
      throw new AppError("Rating must include exactly one assessment per drive focus skill");
    }

    const seenSkillIds = new Set<string>();
    for (const obs of observations) {
      if (!VALID_ASSESSMENTS.has(obs.assessment)) {
        throw new AppError("Invalid assessment level");
      }
      if (seenSkillIds.has(obs.skillId)) {
        throw new AppError("Duplicate skill in rating payload");
      }
      seenSkillIds.add(obs.skillId);
      if (!allowedSkillIds.has(obs.skillId)) {
        throw new AppError("Observation skill must be part of drive focus");
      }
    }

    for (const skillId of focusSkillIds) {
      if (!seenSkillIds.has(skillId)) {
        throw new AppError("Rating must include exactly one assessment per drive focus skill");
      }
    }

    const existingRating = await client.query(
      `SELECT 1 FROM drive_observations
       WHERE journey_id = $1
         AND drive_id = $2
         AND source_type = 'supervisor'
       LIMIT 1`,
      [journeyId, driveId],
    );
    if ((existingRating.rowCount ?? 0) > 0) {
      throw new AppError("Drive has already been rated", 409, "already_rated");
    }

    for (const obs of observations) {
      await client.query(
        `INSERT INTO drive_observations (
           journey_id, drive_id, skill_id, observer_user_id,
           source_type, assessment
         )
         VALUES ($1, $2, $3, $4, 'supervisor', $5)`,
        [journeyId, driveId, obs.skillId, observerUserId, obs.assessment],
      );
    }
  });
}
