import { NextResponse } from "next/server";
import type { HackathonsAPI, ApiResponse, TeamsAPI } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query, queryOne, transaction } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { assignTeamsSchema } from "@/lib/validation/hackathon";

/** Knuth (Fisher-Yates) shuffle — unbiased in-place permutation. */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const TEAM_NAMES = [
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliet",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Papa",
  "Quebec",
  "Romeo",
  "Sierra",
  "Tango",
  "Uniform",
  "Victor",
  "Whiskey",
  "X-ray",
  "Yankee",
  "Zulu",
];

export const POST = requireRole("admin")(async (request, context, auth) => {
  const { id: hackathonId } = await context.params;

  const hackathon = await queryOne<Record<string, unknown>>(
    "SELECT * FROM hackathons WHERE id = @id",
    { id: hackathonId },
  );

  if (!hackathon) {
    return NextResponse.json(
      { error: "Hackathon not found", ok: false },
      { status: 404 },
    );
  }

  let overrideTeamSize: number | undefined;
  try {
    const raw = await request.json();
    const parsed = assignTeamsSchema.safeParse(raw);
    if (parsed.success) {
      overrideTeamSize = parsed.data.teamSize;
    }
  } catch {
    // No body or invalid JSON — use hackathon default
  }

  const teamSize = overrideTeamSize ?? (hackathon.teamSize as number) ?? 5;
  const minTeamSize = Math.ceil(teamSize / 2);

  const unassigned = await query<Record<string, unknown>>(
    "SELECT * FROM hackers WHERE hackathonId = @hid AND teamId IS NULL",
    { hid: hackathonId },
  );

  if (unassigned.length === 0) {
    return NextResponse.json(
      { error: "No unassigned hackers to assign", ok: false },
      { status: 422 },
    );
  }

  const shuffled = fisherYatesShuffle(unassigned);

  // Distribute into teams — last team gets remainder if >= minTeamSize
  const teams: (typeof shuffled)[] = [];
  for (let i = 0; i < shuffled.length; i += teamSize) {
    teams.push(shuffled.slice(i, i + teamSize));
  }

  // Merge runt last team into previous team if below minimum
  if (teams.length > 1 && teams[teams.length - 1].length < minTeamSize) {
    const runt = teams.pop()!;
    teams[teams.length - 1].push(...runt);
  }

  let hackersAssigned = 0;

  // Count existing teams to offset name index
  const existingTeams = await query<{ id: string }>(
    "SELECT id FROM teams WHERE hackathonId = @hid",
    { hid: hackathonId },
  );
  const nameOffset = existingTeams.length;

  for (let i = 0; i < teams.length; i++) {
    const members = teams[i];
    const teamId = `team-${crypto.randomUUID().slice(0, 8)}`;
    const teamName = `Team ${TEAM_NAMES[(nameOffset + i) % TEAM_NAMES.length]}`;

    const memberRecords: TeamsAPI.TeamMember[] = members.map((h) => ({
      hackerId: h.id as string,
      githubLogin: h.githubLogin as string,
      displayName: (h.displayName as string) ?? (h.githubLogin as string),
    }));

    await transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO teams (id, hackathonId, name, members)
         VALUES (@id, @hackathonId, @name, @members)`,
        {
          id: teamId,
          hackathonId,
          name: teamName,
          members: JSON.stringify(memberRecords),
        },
      );

      for (const hacker of members) {
        await tx.execute("UPDATE hackers SET teamId = @teamId WHERE id = @id", {
          teamId,
          id: hacker.id as string,
        });
        hackersAssigned++;
      }
    });
  }

  await auditLog({
    hackathonId,
    action: "teams.assign",
    targetType: "hackathon",
    targetId: hackathonId,
    performedBy: auth.principal.userId,
    details: {
      teamsCreated: teams.length,
      hackersAssigned,
      teamSize,
    },
  });

  const responseData: HackathonsAPI.AssignTeamsResponse = {
    teamsCreated: teams.length,
    hackersAssigned,
  };

  const response: ApiResponse<HackathonsAPI.AssignTeamsResponse> = {
    data: responseData,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});
