import { NextResponse } from "next/server";
import type {
  HackathonsAPI,
  ApiResponse,
  PageResponse,
  HackathonStatus,
} from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { query, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { createHackathonSchema } from "@/lib/validation/hackathon";

async function generateUniqueEventCode(): Promise<string> {
  const maxAttempts = 50;

  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const rows = await query<{ id: string }>(
      "SELECT id FROM hackathons WHERE eventCode = @code AND status != 'archived'",
      { code },
    );

    if (rows.length === 0) return code;
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

  await execute(
    `INSERT INTO hackathons (id, name, description, status, eventCode, teamSize, createdBy, createdAt, launchedAt, archivedAt)
     VALUES (@id, @name, @description, @status, @eventCode, @teamSize, @createdBy, @createdAt, @launchedAt, @archivedAt)`,
    { ...record },
  );

  await execute(
    `INSERT INTO roles (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
     VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @role, @isPrimaryAdmin, @assignedBy, @assignedAt)`,
    {
      id: `role-${auth.principal.userId}-${record.id}`,
      hackathonId: record.id,
      githubUserId: auth.principal.userId,
      githubLogin: auth.principal.githubLogin,
      role: "admin",
      isPrimaryAdmin: 1,
      assignedBy: "system",
      assignedAt: now,
    },
  );

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
  const status = request.nextUrl.searchParams.get(
    "status",
  ) as HackathonStatus | null;
  const pageSize = Math.min(
    Number(request.nextUrl.searchParams.get("pageSize")) || 20,
    100,
  );
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0;

  let sqlText = "SELECT * FROM hackathons WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (status) {
    sqlText += " AND status = @status";
    params.status = status;
  }

  sqlText +=
    " ORDER BY createdAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY";
  params.offset = offset;
  params.pageSize = pageSize;

  const resources = await query<HackathonsAPI.HackathonRecord>(sqlText, params);

  // Strip eventCode from listing responses — event codes are admin-only
  // and should not be exposed to all authenticated users
  const sanitized = resources.map(({ eventCode: _ec, ...rest }) => rest);

  const response: ApiResponse<PageResponse<Omit<HackathonsAPI.HackathonRecord, "eventCode">>> = {
    data: {
      items: sanitized,
      continuationToken:
        resources.length === pageSize ? String(offset + pageSize) : null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
