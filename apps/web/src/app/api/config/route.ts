import { NextResponse } from "next/server";
import type { ConfigAPI, ApiResponse } from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { isGlobalAdmin } from "@/lib/roles";

export const GET = requireAuth(async (_request, _context, auth) => {
  const isAdmin = await isGlobalAdmin(auth.principal.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Access denied. Required role: admin", ok: false },
      { status: 403 },
    );
  }

  const container = getContainer("config");

  const { resources } = await container.items
    .query<ConfigAPI.ConfigRecord>({
      query: "SELECT * FROM c ORDER BY c.key ASC",
    })
    .fetchAll();

  const items: ConfigAPI.ConfigRecord[] = resources.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt,
  }));

  const response: ApiResponse<ConfigAPI.ConfigRecord[]> = {
    data: items,
    ok: true,
  };
  return NextResponse.json(response);
});
