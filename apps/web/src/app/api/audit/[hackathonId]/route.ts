import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuditAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query } from "@/lib/sql";
import { listAuditSchema } from "@/lib/validation/audit";

export const GET = requireRole("admin")(async (
  request: NextRequest,
  context,
  _auth,
) => {
  const { hackathonId } = await context.params;
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const result = listAuditSchema.safeParse(params);
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

  const { action, pageSize = 50 } = result.data;
  const page = Math.max(
    Number(request.nextUrl.searchParams.get("page")) || 1,
    1,
  );
  const offset = (page - 1) * pageSize;

  let sql = "SELECT * FROM audit_log WHERE hackathonId = @hackathonId";
  const sqlParams: Record<string, unknown> = { hackathonId };

  if (action) {
    sql += " AND action = @action";
    sqlParams.action = action;
  }

  sql +=
    " ORDER BY performedAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY";
  sqlParams.offset = offset;
  sqlParams.pageSize = pageSize;

  const rows = await query<Record<string, unknown>>(sql, sqlParams);

  const items: AuditAPI.AuditEntry[] = rows.map((r) => ({
    id: r.id as string,
    hackathonId: r.hackathonId as string,
    action: r.action as AuditAPI.AuditEntry["action"],
    targetType: r.targetType as string,
    targetId: r.targetId as string,
    performedBy: r.performedBy as string,
    performedAt: r.performedAt as string,
    reason: (r.reason as string) ?? null,
    details: r.details ? JSON.parse(r.details as string) : null,
  }));

  const response: ApiResponse<PageResponse<AuditAPI.AuditEntry>> = {
    data: {
      items,
      continuationToken: null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
