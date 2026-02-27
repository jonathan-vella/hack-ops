import { NextResponse } from "next/server";
import type {
  HackathonsAPI,
  ApiResponse,
  PageResponse,
  HackathonStatus,
} from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { createHackathonSchema } from "@/lib/validation/hackathon";

async function generateUniqueEventCode(): Promise<string> {
  const container = getContainer("hackathons");
  const maxAttempts = 50;

  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { resources } = await container.items
      .query({
        query:
          "SELECT c.id FROM c WHERE c.eventCode = @code AND c.status != 'archived'",
        parameters: [{ name: "@code", value: code }],
      })
      .fetchAll();

    if (resources.length === 0) return code;
  }
  throw new Error("Failed to generate unique event code after 50 attempts");
}

export const POST = requireAuth(async (request, _context, auth) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = createHackathonSchema.safeParse(raw);
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
  const container = getContainer("hackathons");
  const eventCode = await generateUniqueEventCode();
  const now = new Date().toISOString();

  const record: HackathonsAPI.HackathonRecord = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description ?? "",
    status: "draft",
    eventCode,
    teamSize: body.teamSize ?? 5,
    createdBy: auth.principal.userId,
    createdAt: now,
    launchedAt: null,
    archivedAt: null,
  };

  await container.items.create({ ...record, _type: "hackathon" });

  const rolesContainer = getContainer("roles");
  await rolesContainer.items.create({
    id: `role-${auth.principal.userId}-${record.id}`,
    _type: "role",
    hackathonId: record.id,
    githubUserId: auth.principal.userId,
    githubLogin: auth.principal.githubLogin,
    role: "admin",
    isPrimaryAdmin: true,
    assignedBy: "system",
    assignedAt: now,
  });

  await auditLog({
    hackathonId: record.id,
    action: "hackathon.create",
    targetType: "hackathon",
    targetId: record.id,
    performedBy: auth.principal.userId,
  });

  const response: ApiResponse<HackathonsAPI.HackathonRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});

export const GET = requireAuth(async (request, _context, _auth) => {
  const container = getContainer("hackathons");
  const status = request.nextUrl.searchParams.get(
    "status",
  ) as HackathonStatus | null;
  const pageSize = Math.min(
    Number(request.nextUrl.searchParams.get("pageSize")) || 20,
    100,
  );
  const continuationToken =
    request.nextUrl.searchParams.get("continuationToken") ?? undefined;

  let query = "SELECT * FROM c WHERE c._type = 'hackathon'";
  const parameters: Array<{ name: string; value: string }> = [];

  if (status) {
    query += " AND c.status = @status";
    parameters.push({ name: "@status", value: status });
  }

  query += " ORDER BY c.createdAt DESC";

  const iterator = container.items.query(
    { query, parameters },
    { maxItemCount: pageSize, continuationToken },
  );
  const { resources, continuationToken: nextToken } =
    await iterator.fetchNext();

  const response: ApiResponse<PageResponse<HackathonsAPI.HackathonRecord>> = {
    data: {
      items: resources as HackathonsAPI.HackathonRecord[],
      continuationToken: nextToken ?? null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
