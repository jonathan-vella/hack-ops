import { NextResponse } from "next/server";
import type { ApiResponse } from "@hackops/shared";
import { requireAuth, checkRole } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";

export const DELETE = requireAuth(async (_request, context, auth) => {
  const { id } = await context.params;

  // Look up the role record first — params.id is a role record ID, not a hackathonId
  const roleDoc = await queryOne<{
    id: string;
    hackathonId: string;
    githubLogin: string;
    role: string;
    isPrimaryAdmin: number;
  }>("SELECT * FROM roles WHERE id = @id", { id });

  if (!roleDoc) {
    return NextResponse.json(
      {
        error: "Role record not found",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Role check using the role record's hackathonId
  const roleCheck = await checkRole(auth.principal, roleDoc.hackathonId, "admin");
  if (roleCheck instanceof NextResponse) return roleCheck;

  // Primary admin cannot be demoted
  if (roleDoc.isPrimaryAdmin) {
    return NextResponse.json(
      {
        error: "Cannot remove the primary admin",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 403 },
    );
  }

  await execute("DELETE FROM roles WHERE id = @id", { id });

  await auditLog({
    hackathonId: roleDoc.hackathonId,
    action: "role.remove",
    targetType: "role",
    targetId: id,
    performedBy: auth.principal.userId,
    details: {
      githubLogin: roleDoc.githubLogin,
      removedRole: roleDoc.role,
    },
  });

  return new NextResponse(null, { status: 204 });
});
