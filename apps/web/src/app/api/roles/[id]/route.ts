import { NextResponse } from "next/server";
import type { ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";

export const DELETE = requireRole("admin")(async (_request, context, auth) => {
  const { id } = await context.params;
  const container = getContainer("roles");

  // Roles are partitioned by hackathonId — query to find the document
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  if (resources.length === 0) {
    return NextResponse.json(
      {
        error: "Role record not found",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const roleDoc = resources[0];

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

  await container.item(id, roleDoc.hackathonId).delete();

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
