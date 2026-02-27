import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuditAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
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

  const { action, pageSize = 50, continuationToken } = result.data;
  const container = getContainer("audit");

  let query = "SELECT * FROM c WHERE c.hackathonId = @hid";
  const parameters: { name: string; value: string }[] = [
    { name: "@hid", value: hackathonId },
  ];

  if (action) {
    query += " AND c.action = @action";
    parameters.push({ name: "@action", value: action });
  }

  query += " ORDER BY c.performedAt DESC";

  const { resources, continuationToken: nextToken } = await container.items
    .query<AuditAPI.AuditEntry>({ query, parameters }, {
      maxItemCount: pageSize,
      continuationToken: continuationToken ?? undefined,
    })
    .fetchNext();

  const items: AuditAPI.AuditEntry[] = resources.map((r) => ({
    id: r.id,
    hackathonId: r.hackathonId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    performedBy: r.performedBy,
    performedAt: r.performedAt,
    reason: r.reason,
    details: r.details,
  }));

  const response: ApiResponse<PageResponse<AuditAPI.AuditEntry>> = {
    data: {
      items,
      continuationToken: nextToken ?? null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
