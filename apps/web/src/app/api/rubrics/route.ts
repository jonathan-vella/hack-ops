import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RubricsAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
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
  const container = getContainer("rubrics");
  const now = new Date().toISOString();

  // Determine the next version number for this hackathon
  const { resources: existing } = await container.items
    .query({
      query:
        "SELECT c.version FROM c WHERE c._type = 'rubric-version' AND c.hackathonId = @hid ORDER BY c.version DESC",
      parameters: [{ name: "@hid", value: body.hackathonId }],
    })
    .fetchAll();

  const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;
  const versionId = `rubric-${body.hackathonId}-v${nextVersion}`;

  // Create the versioned rubric document
  const versionDoc = {
    id: versionId,
    _type: "rubric-version",
    hackathonId: body.hackathonId,
    version: nextVersion,
    categories: body.categories,
    createdBy: auth.principal.userId,
    createdAt: now,
  };
  await container.items.create(versionDoc);

  // Ensure pointer exists; if first rubric, auto-activate it
  const pointerId = `rubric-ptr-${body.hackathonId}`;
  const { resource: pointer } = await container
    .item(pointerId, pointerId)
    .read();

  if (!pointer) {
    await container.items.create({
      id: pointerId,
      _type: "rubric-pointer",
      hackathonId: body.hackathonId,
      activeRubricId: versionId,
      updatedAt: now,
      updatedBy: auth.principal.userId,
    });
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
  const container = getContainer("rubrics");
  const hackathonId =
    request.nextUrl.searchParams.get("hackathonId") ?? auth.hackathonId;
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const pageSize = Math.min(
    Number(request.nextUrl.searchParams.get("pageSize")) || 20,
    100,
  );

  // Read the pointer to know which version is active
  const pointerId = `rubric-ptr-${hackathonId}`;
  const { resource: pointer } = await container
    .item(pointerId, pointerId)
    .read();

  let query =
    "SELECT * FROM c WHERE c._type = 'rubric-version' AND c.hackathonId = @hid";
  const parameters: Array<{ name: string; value: string }> = [
    { name: "@hid", value: hackathonId },
  ];

  if (activeOnly && pointer) {
    query += " AND c.id = @activeId";
    parameters.push({ name: "@activeId", value: pointer.activeRubricId });
  }

  query += " ORDER BY c.version DESC";

  const iterator = container.items.query(
    { query, parameters },
    { maxItemCount: pageSize },
  );
  const { resources, continuationToken } = await iterator.fetchNext();

  const activeRubricId = pointer?.activeRubricId ?? null;

  const items: RubricsAPI.RubricSummary[] = resources.map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      version: r.version as number,
      isActive: r.id === activeRubricId,
      categoryCount: (r.categories as unknown[]).length,
      createdAt: r.createdAt as string,
    }),
  );

  const response: ApiResponse<PageResponse<RubricsAPI.RubricSummary>> = {
    data: { items, continuationToken: continuationToken ?? null },
    ok: true,
  };
  return NextResponse.json(response);
});
