import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RolesAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query, queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { inviteRoleSchema } from "@/lib/validation/role";

export const POST = requireRole("admin")(async (
  request: NextRequest,
  _context,
  auth,
) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = inviteRoleSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
        ok: false,
      },
      { status: 400 },
    );
  }

  const { hackathonId, githubLogin, role } = result.data;

  // Verify the target hackathon exists
  const hackathon = await queryOne<{ id: string }>(
    "SELECT id FROM hackathons WHERE id = @id",
    { id: hackathonId },
  );
  if (!hackathon) {
    return NextResponse.json(
      { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Check for duplicate role in this hackathon
  const existing = await query<{ id: string }>(
    "SELECT id FROM roles WHERE githubLogin = @login AND hackathonId = @hid",
    { login: githubLogin, hid: hackathonId },
  );

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: "User already has a role in this hackathon",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const roleId = `role-invite-${githubLogin}-${hackathonId}`;

  await execute(
    `INSERT INTO roles (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
     VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @role, @isPrimaryAdmin, @assignedBy, @assignedAt)`,
    {
      id: roleId,
      hackathonId,
      githubUserId: `pending:${githubLogin}`,
      githubLogin,
      role,
      isPrimaryAdmin: 0,
      assignedBy: auth.principal.userId,
      assignedAt: now,
    },
  );

  await auditLog({
    hackathonId,
    action: "role.invite",
    targetType: "role",
    targetId: roleId,
    performedBy: auth.principal.userId,
    details: { githubLogin, role },
  });

  const record: RolesAPI.RoleRecord = {
    id: roleId,
    hackathonId,
    githubUserId: `pending:${githubLogin}`,
    githubLogin,
    role,
    isPrimaryAdmin: false,
    assignedBy: auth.principal.userId,
    assignedAt: now,
  };

  const response: ApiResponse<RolesAPI.RoleRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});
