import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, LeaderboardAPI } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { buildLeaderboard } from "@/lib/leaderboard";

export const GET = requireRole(
  "admin",
  "coach",
  "hacker",
)(async (_request: NextRequest, context, _auth) => {
  const { hackathonId } = await context.params;

  const leaderboard = await buildLeaderboard(hackathonId);

  if (!leaderboard) {
    return NextResponse.json(
      {
        error: "Hackathon not found",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const response: ApiResponse<LeaderboardAPI.LeaderboardResponse> = {
    data: leaderboard,
    ok: true,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
    },
  });
});
