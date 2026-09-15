import type pg from "pg";
import { getPool, withTransaction } from "../db/pool.js";
import { createGuestUser } from "./users.js";

export interface DrivingJourney {
  id: string;
  studentUserId: string;
  studentName: string | null;
  licenceType: string;
  transmissionScope: string;
  status: string;
}

export async function createJourneyForStudent(
  displayName: string,
  existingUserId?: string | null,
): Promise<{ journey: DrivingJourney; userId: string }> {
  return withTransaction(async (client) => {
    const userId =
      existingUserId ?? (await createGuestUser(displayName, client)).id;

    if (existingUserId) {
      await client.query(
        `UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1`,
        [existingUserId, displayName.trim()],
      );
    }

    const journeyResult = await client.query(
      `INSERT INTO driving_journeys (student_user_id, licence_type, transmission_scope)
       VALUES ($1, 'B', 'unknown')
       RETURNING id, student_user_id, licence_type, transmission_scope, status`,
      [userId],
    );
    const row = journeyResult.rows[0];

    const userResult = await client.query(
      `SELECT display_name FROM users WHERE id = $1`,
      [userId],
    );

    return {
      userId,
      journey: {
        id: row.id,
        studentUserId: row.student_user_id,
        studentName: userResult.rows[0].display_name,
        licenceType: row.licence_type,
        transmissionScope: row.transmission_scope,
        status: row.status,
      },
    };
  });
}

export async function getJourneyById(
  journeyId: string,
  client?: pg.PoolClient,
): Promise<DrivingJourney | null> {
  const db = client ?? (await import("../db/pool.js")).getPool();
  const result = await db.query(
    `SELECT j.id, j.student_user_id, j.licence_type, j.transmission_scope, j.status,
            u.display_name AS student_name
     FROM driving_journeys j
     JOIN users u ON u.id = j.student_user_id
     WHERE j.id = $1`,
    [journeyId],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    licenceType: row.licence_type,
    transmissionScope: row.transmission_scope,
    status: row.status,
  };
}

export async function resolveHomeJourneyId(
  userId: string,
  client?: pg.PoolClient,
): Promise<string | null> {
  const db = client ?? getPool();

  const studentJourney = await db.query(
    `SELECT id FROM driving_journeys
     WHERE student_user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  if ((studentJourney.rowCount ?? 0) > 0) {
    return studentJourney.rows[0].id as string;
  }

  const supervisorJourneys = await db.query(
    `SELECT journey_id FROM journey_collaborators
     WHERE user_id = $1
       AND role = 'supervisor'
       AND status = 'active'
     ORDER BY created_at DESC`,
    [userId],
  );
  if ((supervisorJourneys.rowCount ?? 0) === 1) {
    return supervisorJourneys.rows[0].journey_id as string;
  }

  return null;
}

export async function listActiveSupervisors(
  journeyId: string,
  client?: pg.PoolClient,
): Promise<{ userId: string; displayName: string | null }[]> {
  const db = client ?? (await import("../db/pool.js")).getPool();
  const result = await db.query(
    `SELECT jc.user_id, u.display_name
     FROM journey_collaborators jc
     JOIN users u ON u.id = jc.user_id
     WHERE jc.journey_id = $1
       AND jc.role = 'supervisor'
       AND jc.status = 'active'
     ORDER BY jc.created_at`,
    [journeyId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
  }));
}
