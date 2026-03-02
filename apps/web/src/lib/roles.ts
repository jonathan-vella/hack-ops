import type { UserRole } from "@hackops/shared";
import { queryOne, execute } from "./sql";

interface RoleDocument {
  id: string;
  hackathonId: string;
  githubUserId: string;
  role: UserRole;
  isPrimaryAdmin: boolean;
}

export async function resolveRole(
  githubUserId: string,
  hackathonId: string,
): Promise<UserRole | null> {
  const row = await queryOne<RoleDocument>(
    "SELECT * FROM roles WHERE githubUserId = @userId AND hackathonId = @hid",
    { userId: githubUserId, hid: hackathonId },
  );
  return row?.role ?? null;
}

export async function isPrimaryAdmin(
  githubUserId: string,
  hackathonId: string,
): Promise<boolean> {
  const row = await queryOne<RoleDocument>(
    "SELECT * FROM roles WHERE githubUserId = @userId AND hackathonId = @hid AND isPrimaryAdmin = 1",
    { userId: githubUserId, hid: hackathonId },
  );
  return row !== null;
}

export function getDevRole(): UserRole | null {
  if (process.env.NODE_ENV !== "development") return null;
  const role = process.env.DEV_USER_ROLE;
  if (role === "admin" || role === "coach" || role === "hacker") return role;
  return null;
}

/**
 * Check if a user holds admin role in any hackathon.
 * Used for app-wide endpoints (config, global audit) that have no hackathonId scope.
 */
export async function isGlobalAdmin(githubUserId: string): Promise<boolean> {
  const devRole = getDevRole();
  if (devRole === "admin") return true;

  const row = await queryOne<RoleDocument>(
    "SELECT TOP 1 * FROM roles WHERE githubUserId = @userId AND role = 'admin'",
    { userId: githubUserId },
  );
  return row !== null;
}

interface UpsertRoleInput extends RoleDocument {
  githubLogin: string;
  assignedBy: string;
  assignedAt: string;
}

/**
 * Upsert a role record — used for bootstrap admin creation.
 * Uses MERGE for idempotent insert-or-update.
 */
export async function upsertRole(role: UpsertRoleInput): Promise<void> {
  await execute(
    `MERGE roles AS target
     USING (SELECT @id AS id) AS source ON target.id = source.id
     WHEN MATCHED THEN
       UPDATE SET role = @role, isPrimaryAdmin = @isPrimaryAdmin
     WHEN NOT MATCHED THEN
       INSERT (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
       VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @role, @isPrimaryAdmin, @assignedBy, @assignedAt);`,
    {
      id: role.id,
      hackathonId: role.hackathonId,
      githubUserId: role.githubUserId,
      githubLogin: role.githubLogin,
      role: role.role,
      isPrimaryAdmin: role.isPrimaryAdmin ? 1 : 0,
      assignedBy: role.assignedBy,
      assignedAt: role.assignedAt,
    },
  );
}
