import { getPool } from "../db/pool.js";

export async function recordAdminAudit(input: {
  adminUserId: string;
  operation: string;
  targetType: string;
  targetId: string;
  summary: string;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO admin_audit_events (
       admin_user_id, operation, target_type, target_id, summary
     )
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.adminUserId,
      input.operation,
      input.targetType,
      input.targetId,
      input.summary.slice(0, 4000),
    ],
  );
}
