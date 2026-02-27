import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RolesAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { listRolesSchema } from "@/lib/validation/role";

export const GET = requireRole("admin")(async (
  request: NextRequest,
  _context,
  _auth,
) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const result = listRolesSchema.safeParse(params);
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

  const { hackathonId, pageSize = 50, continuationToken } = result.data;
  const container = getContainer("roles");

  const querySpec = {
    query:
      "SELECT * FROM c WHERE c.hackathonId = @hid ORDER BY c.assignedAt DESC",
    parameters: [{ name: "@hid", value: hackathonId }],
  };

  const { resources, continuationToken: nextToken } = await container.items
    .query<RolesAPI.RoleRecord>(querySpec, {
      maxItemCount: pageSize,
      continuationToken: continuationToken ?? undefined,
    })
    .fetchNext();

  const items: RolesAPI.RoleRecord[] = resources.map((r) => ({
    id: r.id,
    hackathonId: r.hackathonId,
    githubUserId: r.githubUserId,
    githubLogin: r.githubLogin,
    role: r.role,
    isPrimaryAdmin: r.isPrimaryAdmin,
    assignedBy: r.assignedBy,
    assignedAt: r.assignedAt,
  }));

  const response: ApiResponse<PageResponse<RolesAPI.RoleRecord>> = {
    data: {
      items,
      continuationToken: nextToken ?? null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
