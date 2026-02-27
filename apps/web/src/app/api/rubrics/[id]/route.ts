import { NextResponse } from "next/server";
import type { RubricsAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";

export const GET = requireRole(
  "admin",
  "coach",
)(async (_request, context, _auth) => {
  const { id } = await context.params;
  const container = getContainer("rubrics");

  const { resource } = await container.item(id, id).read();
  if (!resource || resource._type !== "rubric-version") {
    return NextResponse.json(
      { error: "Rubric not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Determine if this version is the active one
  const pointerId = `rubric-ptr-${resource.hackathonId}`;
  const { resource: pointer } = await container
    .item(pointerId, pointerId)
    .read();
  const isActive = pointer?.activeRubricId === id;

  const record: RubricsAPI.RubricRecord = {
    id: resource.id,
    version: resource.version,
    categories: resource.categories,
    isActive,
    createdBy: resource.createdBy,
    createdAt: resource.createdAt,
  };

  const response: ApiResponse<RubricsAPI.RubricRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
