import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  HackathonsAPI,
  ApiResponse,
  HackathonStatus,
} from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query, queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { updateHackathonSchema } from "@/lib/validation/hackathon";

const VALID_TRANSITIONS: Record<HackathonStatus, HackathonStatus[]> = {
  draft: ["active"],
  active: ["archived"],
  archived: [],
};

export const GET = requireRole(
  "admin",
  "coach",
)(async (_request, context, _auth) => {
  const { id } = await context.params;

  const resource = await queryOne<HackathonsAPI.HackathonRecord>(
    "SELECT * FROM hackathons WHERE id = @id",
    { id },
  );
  if (!resource) {
    return NextResponse.json(
      { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const response: ApiResponse<HackathonsAPI.HackathonRecord> = {
    data: resource,
    ok: true,
  };
  return NextResponse.json(response);
});

export const PATCH = requireRole("admin")(async (
  request: NextRequest,
  context,
  auth,
) => {
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = updateHackathonSchema.safeParse(raw);
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
  const existing = await queryOne<Record<string, unknown>>(
    "SELECT * FROM hackathons WHERE id = @id",
    { id },
  );

  if (!existing) {
    return NextResponse.json(
      { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  if (body.status) {
    const allowed = VALID_TRANSITIONS[existing.status as HackathonStatus];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${existing.status} → ${body.status}. Allowed: ${allowed.join(", ") || "none"}`,
          ok: false,
        },
        { status: 422 },
      );
    }
  }

  const now = new Date().toISOString();

  const setClauses: string[] = [];
  const params: Record<string, unknown> = { id };
  if (body.name !== undefined) {
    setClauses.push("name = @name");
    params.name = body.name;
  }
  if (body.description !== undefined) {
    setClauses.push("description = @description");
    params.description = body.description;
  }
  if (body.teamSize !== undefined) {
    setClauses.push("teamSize = @teamSize");
    params.teamSize = body.teamSize;
  }
  if (body.status !== undefined) {
    setClauses.push("status = @status");
    params.status = body.status;
  }
  if (body.status === "active") {
    setClauses.push("launchedAt = @launchedAt");
    params.launchedAt = now;
  }
  if (body.status === "archived") {
    setClauses.push("archivedAt = @archivedAt");
    params.archivedAt = now;
  }

  if (setClauses.length > 0) {
    await execute(
      `UPDATE hackathons SET ${setClauses.join(", ")} WHERE id = @id`,
      params,
    );
  }

  const replaced = await queryOne<HackathonsAPI.HackathonRecord>(
    "SELECT * FROM hackathons WHERE id = @id",
    { id },
  );

  // Initialize progression records when hackathon launches
  if (body.status === "active") {
    const teams = await query<{ id: string }>(
      "SELECT * FROM teams WHERE hackathonId = @hid",
      { hid: id },
    );

    // Find the first challenge for this hackathon (order = 1)
    const firstChallenges = await query<{ id: string }>(
      "SELECT * FROM challenges WHERE hackathonId = @hid AND [order] = 1",
      { hid: id },
    );

    if (teams.length > 0 && firstChallenges.length > 0) {
      const firstChallenge = firstChallenges[0];
      for (const team of teams) {
        await execute(
          `INSERT INTO progressions (id, teamId, hackathonId, currentChallenge, unlockedChallenges)
           VALUES (@id, @teamId, @hackathonId, @currentChallenge, @unlockedChallenges)`,
          {
            id: `prog-${team.id}`,
            teamId: team.id,
            hackathonId: id,
            currentChallenge: 1,
            unlockedChallenges: JSON.stringify([
              {
                challengeId: firstChallenge.id,
                unlockedAt: now,
              },
            ]),
          },
        );
      }
    }
  }

  await auditLog({
    hackathonId: id,
    action: "hackathon.update",
    targetType: "hackathon",
    targetId: id,
    performedBy: auth.principal.userId,
    details: body as Record<string, unknown>,
  });

  const response: ApiResponse<HackathonsAPI.HackathonRecord> = {
    data: replaced as HackathonsAPI.HackathonRecord,
    ok: true,
  };
  return NextResponse.json(response);
});
