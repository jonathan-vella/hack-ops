import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RolesAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
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
  const hackathonsContainer = getContainer("hackathons");
  const { resource: hackathon } = await hackathonsContainer
    .item(hackathonId, hackathonId)
    .read();
  if (!hackathon) {
    return NextResponse.json(
      { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Check for duplicate role in this hackathon
  const rolesContainer = getContainer("roles");
  const { resources: existing } = await rolesContainer.items
    .query({
      query:
        "SELECT * FROM c WHERE c.githubLogin = @login AND c.hackathonId = @hid",
      parameters: [
        { name: "@login", value: githubLogin },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

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

  const roleDoc = {
    id: roleId,
    _type: "role" as const,
    hackathonId,
    githubUserId: `pending:${githubLogin}`,
    githubLogin,
    role,
    isPrimaryAdmin: false,
    assignedBy: auth.principal.userId,
    assignedAt: now,
  };

  await rolesContainer.items.create(roleDoc);

  await auditLog({
    hackathonId,
    action: "role.invite",
    targetType: "role",
    targetId: roleId,
    performedBy: auth.principal.userId,
    details: { githubLogin, role },
  });

  const record: RolesAPI.RoleRecord = {
    id: roleDoc.id,
    hackathonId: roleDoc.hackathonId,
    githubUserId: roleDoc.githubUserId,
    githubLogin: roleDoc.githubLogin,
    role: roleDoc.role,
    isPrimaryAdmin: roleDoc.isPrimaryAdmin,
    assignedBy: roleDoc.assignedBy,
    assignedAt: roleDoc.assignedAt,
  };

  const response: ApiResponse<RolesAPI.RoleRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});
