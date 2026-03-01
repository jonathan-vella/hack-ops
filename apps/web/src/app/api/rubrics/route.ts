import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RubricsAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query, queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { createRubricSchema } from "@/lib/validation/rubric";

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

  const result = createRubricSchema.safeParse(raw);
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

  const body = result.data;
  const now = new Date().toISOString();

  // Determine the next version number for this hackathon
  const existing = await query<{ version: number }>(
    "SELECT version FROM rubric_versions WHERE hackathonId = @hid ORDER BY version DESC",
    { hid: body.hackathonId },
  );

  const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;
  const versionId = `rubric-${body.hackathonId}-v${nextVersion}`;

  // Create the versioned rubric document
  await execute(
    `INSERT INTO rubric_versions (id, hackathonId, version, categories, createdBy, createdAt)
     VALUES (@id, @hackathonId, @version, @categories, @createdBy, @createdAt)`,
    {
      id: versionId,
      hackathonId: body.hackathonId,
      version: nextVersion,
      categories: JSON.stringify(body.categories),
      createdBy: auth.principal.userId,
      createdAt: now,
    },
  );

  // Ensure pointer exists; if first rubric, auto-activate it
  const pointerId = `rubric-ptr-${body.hackathonId}`;
  const pointer = await queryOne<{ id: string; activeRubricId: string }>(
    "SELECT id, activeRubricId FROM rubric_pointers WHERE id = @id",
    { id: pointerId },
  );

  if (!pointer) {
    await execute(
      `INSERT INTO rubric_pointers (id, hackathonId, activeRubricId, updatedAt, updatedBy)
       VALUES (@id, @hackathonId, @activeRubricId, @updatedAt, @updatedBy)`,
      {
        id: pointerId,
        hackathonId: body.hackathonId,
        activeRubricId: versionId,
        updatedAt: now,
        updatedBy: auth.principal.userId,
      },
    );
  }

  const isActive = !pointer || pointer.activeRubricId === versionId;

  await auditLog({
    hackathonId: body.hackathonId,
    action: "rubric.create",
    targetType: "rubric",
    targetId: versionId,
    performedBy: auth.principal.userId,
    details: { version: nextVersion },
  });

  const record: RubricsAPI.RubricRecord = {
    id: versionId,
    version: nextVersion,
    categories: body.categories,
    isActive,
    createdBy: auth.principal.userId,
    createdAt: now,
  };

  const response: ApiResponse<RubricsAPI.RubricRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});

export const GET = requireRole(
  "admin",
  "coach",
)(async (request: NextRequest, _context, auth) => {
  const hackathonId =
    request.nextUrl.searchParams.get("hackathonId") ?? auth.hackathonId;
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const pageSize = Math.min(
    Number(request.nextUrl.searchParams.get("pageSize")) || 20,
    100,
  );

  // Read the pointer to know which version is active
  const pointerId = `rubric-ptr-${hackathonId}`;
  const pointer = await queryOne<{ activeRubricId: string }>(
    "SELECT activeRubricId FROM rubric_pointers WHERE id = @id",
    { id: pointerId },
  );

  let sqlText = "SELECT * FROM rubric_versions WHERE hackathonId = @hid";
  const params: Record<string, unknown> = { hid: hackathonId };

  if (activeOnly && pointer) {
    sqlText += " AND id = @activeId";
    params.activeId = pointer.activeRubricId;
  }

  sqlText +=
    " ORDER BY version DESC OFFSET 0 ROWS FETCH NEXT @pageSize ROWS ONLY";
  params.pageSize = pageSize;

  const resources = await query<Record<string, unknown>>(sqlText, params);

  const activeRubricId = pointer?.activeRubricId ?? null;

  const items: RubricsAPI.RubricSummary[] = resources.map((r) => ({
    id: r.id as string,
    version: r.version as number,
    isActive: r.id === activeRubricId,
    categoryCount: (JSON.parse(r.categories as string) as unknown[]).length,
    createdAt: r.createdAt as string,
  }));

  const response: ApiResponse<PageResponse<RubricsAPI.RubricSummary>> = {
    data: { items, continuationToken: null },
    ok: true,
  };
  return NextResponse.json(response);
});
