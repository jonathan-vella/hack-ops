import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  ChallengesAPI,
  ApiResponse,
  PageResponse,
} from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
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
  const container = getContainer("challenges");

  // Verify order is sequential — no gaps or duplicates
  const { resources: existing } = await container.items
    .query({
      query:
        "SELECT c.order FROM c WHERE c._type = 'challenge' AND c.hackathonId = @hid ORDER BY c.order ASC",
      parameters: [{ name: "@hid", value: body.hackathonId }],
    })
    .fetchAll();

  const existingOrders = existing.map(
    (c: Record<string, unknown>) => c.order as number,
  );

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

  await container.items.create({
    ...record,
    _type: "challenge",
  });

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

  const container = getContainer("challenges");
  const iterator = container.items.query(
    {
      query:
        "SELECT * FROM c WHERE c._type = 'challenge' AND c.hackathonId = @hid ORDER BY c.order ASC",
      parameters: [{ name: "@hid", value: hackathonId }],
    },
    { maxItemCount: pageSize },
  );
  const { resources, continuationToken } = await iterator.fetchNext();

  const items: ChallengesAPI.ChallengeRecord[] = resources.map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      hackathonId: r.hackathonId as string,
      order: r.order as number,
      title: r.title as string,
      description: r.description as string,
      maxScore: r.maxScore as number,
      createdBy: r.createdBy as string,
      createdAt: r.createdAt as string,
    }),
  );

  const response: ApiResponse<PageResponse<ChallengesAPI.ChallengeRecord>> = {
    data: { items, continuationToken: continuationToken ?? null },
    ok: true,
  };
  return NextResponse.json(response);
});
