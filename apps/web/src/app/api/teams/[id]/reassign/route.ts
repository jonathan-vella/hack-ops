import { NextResponse } from "next/server";
import type { ApiResponse, TeamsAPI } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { queryOne, transaction } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { reassignSchema } from "@/lib/validation/team";

export const PATCH = requireRole("admin")(async (request, context, auth) => {
  const { id: sourceTeamId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = reassignSchema.safeParse(raw);
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

  const { hackerId, targetTeamId } = result.data;

  // Read source team
  const sourceTeam = await queryOne<{
    id: string;
    hackathonId: string;
    members: string;
  }>("SELECT id, hackathonId, members FROM teams WHERE id = @id", {
    id: sourceTeamId,
  });
  if (!sourceTeam) {
    return NextResponse.json(
      { error: "Source team not found", ok: false },
      { status: 404 },
    );
  }

  // Read target team
  const targetTeam = await queryOne<{
    id: string;
    hackathonId: string;
    members: string;
  }>("SELECT id, hackathonId, members FROM teams WHERE id = @id", {
    id: targetTeamId,
  });
  if (!targetTeam) {
    return NextResponse.json(
      { error: "Target team not found", ok: false },
      { status: 404 },
    );
  }

  // Both teams must belong to the same hackathon
  if (sourceTeam.hackathonId !== targetTeam.hackathonId) {
    return NextResponse.json(
      { error: "Cannot reassign across different hackathons", ok: false },
      { status: 422 },
    );
  }

  const sourceMembers: TeamsAPI.TeamMember[] = JSON.parse(
    sourceTeam.members || "[]",
  );
  const targetMembers: TeamsAPI.TeamMember[] = JSON.parse(
    targetTeam.members || "[]",
  );

  // Find hacker in source team
  const memberIndex = sourceMembers.findIndex(
    (m: TeamsAPI.TeamMember) => m.hackerId === hackerId,
  );
  if (memberIndex === -1) {
    return NextResponse.json(
      { error: "Hacker not found in source team", ok: false },
      { status: 404 },
    );
  }

  const member = sourceMembers[memberIndex];

  // Move member: remove from source, add to target
  sourceMembers.splice(memberIndex, 1);
  targetMembers.push(member);

  await transaction(async (tx) => {
    await tx.execute("UPDATE teams SET members = @members WHERE id = @id", {
      members: JSON.stringify(sourceMembers),
      id: sourceTeamId,
    });
    await tx.execute("UPDATE teams SET members = @members WHERE id = @id", {
      members: JSON.stringify(targetMembers),
      id: targetTeamId,
    });
    await tx.execute(
      "UPDATE hackers SET teamId = @teamId WHERE id = @hackerId",
      { teamId: targetTeamId, hackerId },
    );
  });

  await auditLog({
    hackathonId: sourceTeam.hackathonId,
    action: "team.reassign",
    targetType: "hacker",
    targetId: hackerId,
    performedBy: auth.principal.userId,
    details: {
      fromTeamId: sourceTeamId,
      toTeamId: targetTeamId,
    },
  });

  const response: ApiResponse<{ success: true }> = {
    data: { success: true },
    ok: true,
  };
  return NextResponse.json(response);
});
