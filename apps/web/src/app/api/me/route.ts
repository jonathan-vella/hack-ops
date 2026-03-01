import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole, EasyAuthPrincipal } from "@hackops/shared";
import { getAuthPrincipal } from "@/lib/auth";
import { query, execute } from "@/lib/sql";

interface RoleDoc {
  hackathonId: string;
  role: UserRole;
}

/**
 * Parse ADMIN_GITHUB_IDS env var — accepts numeric IDs or GitHub
 * usernames (case-insensitive), comma-separated.
 */
function getBootstrapAdminIdentifiers(): string[] {
  const raw = process.env.ADMIN_GITHUB_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Auto-create an admin role for bootstrap admins on their first login.
 * Matches against both the numeric userId and the githubLogin so the
 * env var can contain either form (e.g. "25802147,jonathan-vella").
 * If the user already holds an admin role the check is skipped.
 */
async function bootstrapAdminIfNeeded(
  userId: string,
  githubLogin: string,
  existingRoles: RoleDoc[],
): Promise<RoleDoc[]> {
  const adminIdentifiers = getBootstrapAdminIdentifiers();
  const isBootstrapAdmin =
    adminIdentifiers.includes(userId.toLowerCase()) ||
    adminIdentifiers.includes(githubLogin.toLowerCase());
  if (!isBootstrapAdmin) return existingRoles;
  if (existingRoles.some((r) => r.role === "admin")) return existingRoles;

  const roleId = `role-${userId}-__global__`;
  const now = new Date().toISOString();

  try {
    await execute(
      `MERGE INTO roles AS target
       USING (SELECT @id AS id) AS source
       ON target.id = source.id
       WHEN MATCHED THEN
         UPDATE SET role = 'admin', isPrimaryAdmin = 1, assignedBy = 'system-bootstrap', assignedAt = @assignedAt
       WHEN NOT MATCHED THEN
         INSERT (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
         VALUES (@id, @hackathonId, @githubUserId, @githubLogin, 'admin', 1, 'system-bootstrap', @assignedAt);`,
      {
        id: roleId,
        hackathonId: "__global__",
        githubUserId: userId,
        githubLogin,
        assignedAt: now,
      },
    );
  } catch {
    // Non-fatal — admin role creation failed but user can still use the app
  }

  return [...existingRoles, { hackathonId: "__global__", role: "admin" }];
}

export async function GET(request: NextRequest) {
  const principal = getAuthPrincipal(request.headers);
  if (!principal) {
    return NextResponse.json(
      { error: "Authentication required", ok: false },
      { status: 401 },
    );
  }

  const devRole =
    process.env.NODE_ENV === "development" ? process.env.DEV_USER_ROLE : null;

  let roles: Array<{ hackathonId: string; role: UserRole }> = [];

  if (devRole === "admin" || devRole === "coach" || devRole === "hacker") {
    roles = [{ hackathonId: "dev", role: devRole }];
  } else {
    try {
      roles = await query<RoleDoc>(
        "SELECT hackathonId, role FROM roles WHERE githubUserId = @uid",
        { uid: principal.userId },
      );
    } catch {
      roles = [];
    }

    // Auto-create admin role for bootstrap admins on first login
    roles = await bootstrapAdminIfNeeded(
      principal.userId,
      principal.githubLogin,
      roles,
    );
  }

  const highestRole = deriveHighestRole(roles.map((r) => r.role));

  const data: MeResponse = {
    principal,
    roles,
    highestRole,
  };

  return NextResponse.json({ data, ok: true });
}

function deriveHighestRole(roleList: UserRole[]): UserRole | null {
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("coach")) return "coach";
  if (roleList.includes("hacker")) return "hacker";
  return null;
}

export interface MeResponse {
  principal: EasyAuthPrincipal;
  roles: Array<{ hackathonId: string; role: UserRole }>;
  highestRole: UserRole | null;
}
