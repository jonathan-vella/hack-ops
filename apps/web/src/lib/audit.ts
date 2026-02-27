import { getContainer } from "./cosmos";

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
 * Write an immutable audit record to the `audit` container.
 * Used by submission approve/reject, score override, and role changes.
 */
export async function auditLog(params: AuditParams): Promise<void> {
  const container = getContainer("audit");
  await container.items.create({
    id: crypto.randomUUID(),
    hackathonId: params.hackathonId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    performedBy: params.performedBy,
    performedAt: new Date().toISOString(),
    reason: params.reason ?? null,
    details: params.details ?? null,
  });
}
