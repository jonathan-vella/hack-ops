import { NextResponse } from "next/server";
import type { TeamsAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { query } from "@/lib/sql";

export const GET = requireRole(
  "admin",
  "coach",
)(async (request, _context, _auth) => {
  const hackathonId = request.nextUrl.searchParams.get("hackathonId");
  if (!hackathonId) {
    return NextResponse.json(
      { error: "hackathonId query parameter is required", ok: false },
      { status: 400 },
    );
  }

  const pageSize = Math.min(
    Number(request.nextUrl.searchParams.get("pageSize")) || 20,
    100,
  );
  const page = Math.max(
    Number(request.nextUrl.searchParams.get("page")) || 1,
    1,
  );
  const offset = (page - 1) * pageSize;

  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM teams WHERE hackathonId = @hackathonId ORDER BY name ASC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    { hackathonId, offset, pageSize },
  );

  const items: TeamsAPI.TeamRecord[] = rows.map((r) => ({
    id: r.id as string,
    hackathonId: r.hackathonId as string,
    name: r.name as string,
    members: r.members ? JSON.parse(r.members as string) : [],
  }));

  const response: ApiResponse<PageResponse<TeamsAPI.TeamRecord>> = {
    data: {
      items,
      continuationToken: null,
    },
    ok: true,
  };
  return NextResponse.json(response);
});
