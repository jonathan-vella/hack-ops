import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ChallengesAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import {
  createChallengeSchema,
  listChallengesSchema,
} from "@/lib/validation/challenge";

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

  const result = createChallengeSchema.safeParse(raw);
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

  // Verify order is sequential — no gaps or duplicates
  const existing = await query<{ order: number }>(
    "SELECT [order] FROM challenges WHERE hackathonId = @hid ORDER BY [order] ASC",
    { hid: body.hackathonId },
  );

  const existingOrders = existing.map((c) => c.order);

  if (existingOrders.includes(body.order)) {
    return NextResponse.json(
      {
        error: `Challenge with order ${body.order} already exists for this hackathon`,
        ok: false,
      },
      { status: 409 },
    );
  }

  // Order must be exactly next in sequence (1, 2, 3...)
  const expectedNext = existingOrders.length + 1;
  if (body.order !== expectedNext) {
    return NextResponse.json(
      {
        error: `Order must be sequential. Expected: ${expectedNext}, got: ${body.order}`,
        ok: false,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const record: ChallengesAPI.ChallengeRecord = {
    id: crypto.randomUUID(),
    hackathonId: body.hackathonId,
    order: body.order,
    title: body.title,
    description: body.description,
    maxScore: body.maxScore,
    createdBy: auth.principal.userId,
    createdAt: now,
  };

  await execute(
    `INSERT INTO challenges (id, hackathonId, [order], title, description, maxScore, createdBy, createdAt)
     VALUES (@id, @hackathonId, @order, @title, @description, @maxScore, @createdBy, @createdAt)`,
    {
      id: record.id,
      hackathonId: record.hackathonId,
      order: record.order,
      title: record.title,
      description: record.description,
      maxScore: record.maxScore,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
    },
  );

  await auditLog({
    hackathonId: body.hackathonId,
    action: "challenge.create",
    targetType: "challenge",
    targetId: record.id,
    performedBy: auth.principal.userId,
    details: { order: body.order, title: body.title },
  });

  const response: ApiResponse<ChallengesAPI.ChallengeRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});

export const GET = requireRole(
  "admin",
  "coach",
  "hacker",
)(async (request: NextRequest, _context, _auth) => {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parseResult = listChallengesSchema.safeParse(params);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parseResult.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
        ok: false,
      },
      { status: 400 },
    );
  }

  const { hackathonId, pageSize: rawPageSize } = parseResult.data;
  const pageSize = Math.min(rawPageSize ?? 50, 100);

  const resources = await query<Record<string, unknown>>(
    `SELECT * FROM challenges WHERE hackathonId = @hid
     ORDER BY [order] ASC
     OFFSET 0 ROWS FETCH NEXT @pageSize ROWS ONLY`,
    { hid: hackathonId, pageSize },
  );

  const items: ChallengesAPI.ChallengeRecord[] = resources.map((r) => ({
    id: r.id as string,
    hackathonId: r.hackathonId as string,
    order: r.order as number,
    title: r.title as string,
    description: r.description as string,
    maxScore: r.maxScore as number,
    createdBy: r.createdBy as string,
    createdAt: r.createdAt as string,
  }));

  const response: ApiResponse<PageResponse<ChallengesAPI.ChallengeRecord>> = {
    data: { items, continuationToken: null },
    ok: true,
  };
  return NextResponse.json(response);
});
