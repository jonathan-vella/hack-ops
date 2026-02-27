import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ProgressionAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { getProgressionSchema } from "@/lib/validation/progression";

export const GET = requireRole(
  "admin",
  "coach",
  "hacker",
)(async (request: NextRequest, _context, _auth) => {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parseResult = getProgressionSchema.safeParse(params);

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

  const { hackathonId, teamId } = parseResult.data;
  const container = getContainer("progression");

  const { resources } = await container.items
    .query({
      query:
        "SELECT * FROM c WHERE c._type = 'progression' AND c.teamId = @tid AND c.hackathonId = @hid",
      parameters: [
        { name: "@tid", value: teamId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (resources.length === 0) {
    return NextResponse.json(
      {
        error: "No progression record found for this team and hackathon",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const r = resources[0] as Record<string, unknown>;
  const record: ProgressionAPI.ProgressionRecord = {
    id: r.id as string,
    teamId: r.teamId as string,
    hackathonId: r.hackathonId as string,
    currentChallenge: r.currentChallenge as number,
    unlockedChallenges:
      r.unlockedChallenges as ProgressionAPI.UnlockedChallenge[],
  };

  const response: ApiResponse<ProgressionAPI.ProgressionRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
