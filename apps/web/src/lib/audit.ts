import { execute } from "./sql";

interface AuditParams {
  hackathonId: string;
  action: string;
  targetType: string;
  targetId: string;
  performedBy: string;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Write an immutable audit record to the `audit_log` table.
 * Used by submission approve/reject, score override, and role changes.
 */
export async function auditLog(params: AuditParams): Promise<void> {
  await execute(
    `INSERT INTO audit_log (id, hackathonId, action, targetType, targetId, performedBy, performedAt, reason, details)
     VALUES (@id, @hackathonId, @action, @targetType, @targetId, @performedBy, @performedAt, @reason, @details)`,
    {
      id: crypto.randomUUID(),
      hackathonId: params.hackathonId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      performedBy: params.performedBy,
      performedAt: new Date().toISOString(),
      reason: params.reason ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  );
}
