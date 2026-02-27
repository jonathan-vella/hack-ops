import { NextResponse } from "next/server";
import type { TeamsAPI, ApiResponse, PageResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";

export const GET = requireRole("admin", "coach")(
  async (request, _context, _auth) => {
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
    const continuationToken =
      request.nextUrl.searchParams.get("continuationToken") ?? undefined;

    const container = getContainer("teams");
    const iterator = container.items.query(
      {
        query:
          "SELECT * FROM c WHERE c.hackathonId = @hid ORDER BY c.name ASC",
        parameters: [{ name: "@hid", value: hackathonId }],
      },
      { maxItemCount: pageSize, continuationToken },
    );

    const { resources, continuationToken: nextToken } =
      await iterator.fetchNext();

    const response: ApiResponse<PageResponse<TeamsAPI.TeamRecord>> = {
      data: {
        items: resources as TeamsAPI.TeamRecord[],
        continuationToken: nextToken ?? null,
      },
      ok: true,
    };
    return NextResponse.json(response);
  },
);