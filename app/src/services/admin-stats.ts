import { getPool } from "../db/pool.js";

/**
 * Measurable Beta Validation Gate "aktiv elevresa".
 *
 * Locked loop in kravspec §16:
 *   journey_created → supervisor_connected → drive_focus_saved →
 *   drive_started → drive_completed → rating_completed → recap_viewed
 *
 * `recap_viewed` is not persisted on any domain table, and admin must not
 * introduce an analytics event layer. The last measurable step is therefore
 * a completed drive that has Drive Focus and a supervisor rating.
 */
const ACTIVE_JOURNEY_SQL = `
  SELECT j.id
  FROM driving_journeys j
  WHERE EXISTS (
    SELECT 1
    FROM journey_collaborators c
    WHERE c.journey_id = j.id
      AND c.role = 'supervisor'
  )
  AND EXISTS (
    SELECT 1
    FROM drives d
    WHERE d.journey_id = j.id
      AND d.ended_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM drive_focus_skills f
        WHERE f.drive_id = d.id AND f.journey_id = d.journey_id
      )
      AND EXISTS (
        SELECT 1 FROM drive_observations o
        WHERE o.drive_id = d.id
          AND o.journey_id = d.journey_id
          AND o.source_type = 'supervisor'
      )
  )
`;

const RATED_COMPLETED_DRIVES_SQL = `
  SELECT d.journey_id, d.id, d.ended_at
  FROM drives d
  WHERE d.ended_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM drive_observations o
      WHERE o.drive_id = d.id
        AND o.journey_id = d.journey_id
        AND o.source_type = 'supervisor'
    )
`;

/** Last 7 Stockholm calendar days including today. */
const START_7_SQL = `(date_trunc('day', now() AT TIME ZONE 'Europe/Stockholm') - interval '6 days') AT TIME ZONE 'Europe/Stockholm'`;
/** Last 30 Stockholm calendar days including today. */
const START_30_SQL = `(date_trunc('day', now() AT TIME ZONE 'Europe/Stockholm') - interval '29 days') AT TIME ZONE 'Europe/Stockholm'`;

const CANONICAL_OBSERVATION_SQL = `
  FROM drive_observations o
  WHERE NOT EXISTS (
    SELECT 1
    FROM drive_observations newer
    WHERE newer.supersedes_observation_id = o.id
      AND newer.journey_id = o.journey_id
  )
`;

export interface DayCount {
  day: string;
  count: number;
}

export interface AdminBetaStats {
  waitlistNew7d: number;
  waitlistNew30d: number;
  activeJourneys: number;
  betaGateTarget: number;
  firstDriveCompletion: {
    firstJourneys: number;
    completedCoreLoop: number;
    target: number;
  };
  secondDriveRate: {
    withFirstRatedDrive: number;
    withSecondWithin14d: number;
    first25Active: number;
    first25WithSecondWithin14d: number;
    targetOfFirst25: number;
  };
  multiSupervisorJourneys: number;
  drivesCreated7d: number;
  drivesCreated30d: number;
  drivesCompleted7d: number;
  drivesCompleted30d: number;
  drivesOpen: number;
  canonicalObservations: number;
  emailBounces24h: number;
  emailComplaints24h: number;
  funnel: {
    journeyCreated: number;
    supervisorConnected: number;
    firstDrive: number;
    firstRatedCompletedDrive: number;
    secondDriveCompleted: number;
  };
  drivesCreatedPerDay: DayCount[];
  drivesCompletedPerDay: DayCount[];
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const result = await getPool().query(sql, params);
  return num(result.rows[0]?.count);
}

async function daySeries(
  timestampColumn: "started_at" | "ended_at",
): Promise<DayCount[]> {
  const filter =
    timestampColumn === "ended_at" ? `AND ${timestampColumn} IS NOT NULL` : "";
  const result = await getPool().query(
    `WITH days AS (
       SELECT generate_series(
         (date_trunc('day', now() AT TIME ZONE 'Europe/Stockholm') - interval '29 days')::date,
         (now() AT TIME ZONE 'Europe/Stockholm')::date,
         interval '1 day'
       )::date AS day
     ),
     counted AS (
       SELECT (${timestampColumn} AT TIME ZONE 'Europe/Stockholm')::date AS day,
              count(*)::int AS n
       FROM drives
       WHERE ${timestampColumn} >= ${START_30_SQL}
         ${filter}
       GROUP BY 1
     )
     SELECT days.day::text AS day, COALESCE(counted.n, 0)::int AS count
     FROM days
     LEFT JOIN counted ON counted.day = days.day
     ORDER BY days.day`,
  );
  return result.rows.map((row) => ({
    day: String(row.day),
    count: num(row.count),
  }));
}

export async function getAdminBetaStats(): Promise<AdminBetaStats> {
  const [
    waitlistNew7d,
    waitlistNew30d,
    activeJourneys,
    firstJourneys,
    firstJourneysCompleted,
    secondRate,
    first25Second,
    multiSupervisorJourneys,
    drivesCreated7d,
    drivesCreated30d,
    drivesCompleted7d,
    drivesCompleted30d,
    drivesOpen,
    canonicalObservations,
    emailBounces24h,
    emailComplaints24h,
    funnel,
    drivesCreatedPerDay,
    drivesCompletedPerDay,
  ] = await Promise.all([
    count(
      `SELECT count(*)::int AS count FROM interest_signups WHERE created_at >= ${START_7_SQL}`,
    ),
    count(
      `SELECT count(*)::int AS count FROM interest_signups WHERE created_at >= ${START_30_SQL}`,
    ),
    count(`SELECT count(*)::int AS count FROM (${ACTIVE_JOURNEY_SQL}) active_j`),
    count(
      `SELECT count(*)::int AS count FROM (
         SELECT id FROM driving_journeys ORDER BY created_at ASC, id ASC LIMIT 25
       ) first_j`,
    ),
    count(
      `SELECT count(*)::int AS count FROM (
         SELECT id FROM driving_journeys ORDER BY created_at ASC, id ASC LIMIT 25
       ) first_j
       WHERE first_j.id IN (${ACTIVE_JOURNEY_SQL})`,
    ),
    getPool().query(
      `WITH rated AS (${RATED_COMPLETED_DRIVES_SQL}),
            first_rated AS (
              SELECT journey_id, min(ended_at) AS first_ended_at
              FROM rated
              GROUP BY journey_id
            )
       SELECT
         count(*)::int AS with_first,
         count(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM rated r
             WHERE r.journey_id = first_rated.journey_id
               AND r.ended_at > first_rated.first_ended_at
               AND r.ended_at <= first_rated.first_ended_at + interval '14 days'
           )
         )::int AS with_second
       FROM first_rated
       WHERE first_rated.journey_id IN (${ACTIVE_JOURNEY_SQL})`,
    ),
    getPool().query(
      `WITH rated AS (${RATED_COMPLETED_DRIVES_SQL}),
            first_rated AS (
              SELECT journey_id, min(ended_at) AS first_ended_at
              FROM rated
              WHERE journey_id IN (${ACTIVE_JOURNEY_SQL})
              GROUP BY journey_id
            ),
            first_25 AS (
              SELECT journey_id, first_ended_at
              FROM first_rated
              ORDER BY first_ended_at ASC, journey_id ASC
              LIMIT 25
            )
       SELECT
         count(*)::int AS first_25_active,
         count(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM rated r
             WHERE r.journey_id = first_25.journey_id
               AND r.ended_at > first_25.first_ended_at
               AND r.ended_at <= first_25.first_ended_at + interval '14 days'
           )
         )::int AS with_second
       FROM first_25`,
    ),
    count(
      `SELECT count(*)::int AS count
       FROM (
         SELECT journey_id
         FROM journey_collaborators
         WHERE role = 'supervisor'
         GROUP BY journey_id
         HAVING count(DISTINCT user_id) > 1
       ) multi`,
    ),
    count(
      `SELECT count(*)::int AS count FROM drives WHERE started_at >= ${START_7_SQL}`,
    ),
    count(
      `SELECT count(*)::int AS count FROM drives WHERE started_at >= ${START_30_SQL}`,
    ),
    count(
      `SELECT count(*)::int AS count FROM drives
       WHERE ended_at IS NOT NULL AND ended_at >= ${START_7_SQL}`,
    ),
    count(
      `SELECT count(*)::int AS count FROM drives
       WHERE ended_at IS NOT NULL AND ended_at >= ${START_30_SQL}`,
    ),
    count(`SELECT count(*)::int AS count FROM drives WHERE ended_at IS NULL`),
    count(`SELECT count(*)::int AS count ${CANONICAL_OBSERVATION_SQL}`),
    count(
      `SELECT count(*)::int AS count FROM resend_webhook_events
       WHERE event_type = 'email.bounced'
         AND received_at >= now() - interval '24 hours'`,
    ),
    count(
      `SELECT count(*)::int AS count FROM resend_webhook_events
       WHERE event_type = 'email.complained'
         AND received_at >= now() - interval '24 hours'`,
    ),
    getPool().query(
      `SELECT
         (SELECT count(*)::int FROM driving_journeys) AS journey_created,
         (SELECT count(*)::int FROM driving_journeys j
          WHERE EXISTS (
            SELECT 1 FROM journey_collaborators c
            WHERE c.journey_id = j.id AND c.role = 'supervisor'
          )) AS supervisor_connected,
         (SELECT count(*)::int FROM driving_journeys j
          WHERE EXISTS (SELECT 1 FROM drives d WHERE d.journey_id = j.id)
         ) AS first_drive,
         (SELECT count(*)::int FROM driving_journeys j
          WHERE EXISTS (
            SELECT 1 FROM (${RATED_COMPLETED_DRIVES_SQL}) rated
            WHERE rated.journey_id = j.id
          )) AS first_rated,
         (SELECT count(*)::int FROM driving_journeys j
          WHERE (
            SELECT count(*) FROM (${RATED_COMPLETED_DRIVES_SQL}) rated
            WHERE rated.journey_id = j.id
          ) >= 2) AS second_drive`,
    ),
    daySeries("started_at"),
    daySeries("ended_at"),
  ]);

  const secondRow = secondRate.rows[0] ?? {};
  const first25Row = first25Second.rows[0] ?? {};
  const funnelRow = funnel.rows[0] ?? {};

  return {
    waitlistNew7d,
    waitlistNew30d,
    activeJourneys,
    betaGateTarget: 25,
    firstDriveCompletion: {
      firstJourneys,
      completedCoreLoop: firstJourneysCompleted,
      target: 20,
    },
    secondDriveRate: {
      withFirstRatedDrive: num(secondRow.with_first),
      withSecondWithin14d: num(secondRow.with_second),
      first25Active: num(first25Row.first_25_active),
      first25WithSecondWithin14d: num(first25Row.with_second),
      targetOfFirst25: 12,
    },
    multiSupervisorJourneys,
    drivesCreated7d,
    drivesCreated30d,
    drivesCompleted7d,
    drivesCompleted30d,
    drivesOpen,
    canonicalObservations,
    emailBounces24h,
    emailComplaints24h,
    funnel: {
      journeyCreated: num(funnelRow.journey_created),
      supervisorConnected: num(funnelRow.supervisor_connected),
      firstDrive: num(funnelRow.first_drive),
      firstRatedCompletedDrive: num(funnelRow.first_rated),
      secondDriveCompleted: num(funnelRow.second_drive),
    },
    drivesCreatedPerDay,
    drivesCompletedPerDay,
  };
}

export async function listRecentInterestSignups(limit = 5) {
  const result = await getPool().query(
    `SELECT id, created_at, name, email, role, status
     FROM interest_signups
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    createdAt: new Date(String(row.created_at)).toISOString(),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
    status: String(row.status),
  }));
}
