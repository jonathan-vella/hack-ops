import { NextResponse } from "next/server";
import type { ApiResponse, TeamsAPI } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { reassignSchema } from "@/lib/validation/team";

export const PATCH = requireRole("admin")(
  async (request, context, auth) => {
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
    const teamsContainer = getContainer("teams");

    // Read source team
    const { resource: sourceTeam } = await teamsContainer
      .item(sourceTeamId, auth.hackathonId)
      .read();
    if (!sourceTeam) {
      return NextResponse.json(
        { error: "Source team not found", ok: false },
        { status: 404 },
      );
    }

    // Read target team
    const { resource: targetTeam } = await teamsContainer
      .item(targetTeamId, auth.hackathonId)
      .read();
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

    // Find hacker in source team
    const memberIndex = sourceTeam.members.findIndex(
      (m: TeamsAPI.TeamMember) => m.hackerId === hackerId,
    );
    if (memberIndex === -1) {
      return NextResponse.json(
        { error: "Hacker not found in source team", ok: false },
        { status: 404 },
      );
    }

    const member = sourceTeam.members[memberIndex];

    // Move member: remove from source, add to target
    sourceTeam.members.splice(memberIndex, 1);
    targetTeam.members.push(member);

    await teamsContainer
      .item(sourceTeamId, sourceTeam.hackathonId)
      .replace(sourceTeam);
    await teamsContainer
      .item(targetTeamId, targetTeam.hackathonId)
      .replace(targetTeam);

    // Update hacker's teamId
    const hackersContainer = getContainer("hackers");
    const { resource: hacker } = await hackersContainer
      .item(hackerId, sourceTeam.hackathonId)
      .read();
    if (hacker) {
      await hackersContainer
        .item(hackerId, sourceTeam.hackathonId)
        .replace({ ...hacker, teamId: targetTeamId });
    }

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
  },
);