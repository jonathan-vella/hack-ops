import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RolesAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query } from "@/lib/sql";
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

  const { hackathonId, pageSize = 50 } = result.data;
  const page = Math.max(
    Number(request.nextUrl.searchParams.get("page")) || 1,
    1,
  );
  const offset = (page - 1) * pageSize;

  interface SqlRoleRow {
    id: string;
    hackathonId: string;
    githubUserId: string;
    githubLogin: string;
    role: RolesAPI.RoleRecord["role"];
    isPrimaryAdmin: number;
    assignedBy: string;
    assignedAt: string;
  }

  const resources = await query<SqlRoleRow>(
    `SELECT * FROM roles WHERE hackathonId = @hid
     ORDER BY assignedAt DESC
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    { hid: hackathonId, offset, pageSize },
  );

  const items: RolesAPI.RoleRecord[] = resources.map((r) => ({
    id: r.id,
    hackathonId: r.hackathonId,
    githubUserId: r.githubUserId,
    githubLogin: r.githubLogin,
    role: r.role,
    isPrimaryAdmin: Boolean(r.isPrimaryAdmin),
    assignedBy: r.assignedBy,
    assignedAt: r.assignedAt,
  }));

  const response: ApiResponse<PageResponse<RolesAPI.RoleRecord>> = {
    data: {
      items,
      continuationToken: null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
