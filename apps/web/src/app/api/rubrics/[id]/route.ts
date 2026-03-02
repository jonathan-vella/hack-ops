import { NextResponse } from "next/server";
import type { RubricsAPI, ApiResponse } from "@hackops/shared";
import { requireAuth, checkRole } from "@/lib/guards";
import { queryOne } from "@/lib/sql";

export const GET = requireAuth(async (_request, context, auth) => {
  const { id } = await context.params;

  // Look up resource first — params.id is a rubric version ID, not a hackathonId
  const resource = await queryOne<Record<string, unknown>>(
    "SELECT * FROM rubric_versions WHERE id = @id",
    { id },
  );
  if (!resource) {
    return NextResponse.json(
      { error: "Rubric not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Role check using the rubric's hackathonId
  const roleCheck = await checkRole(
    auth.principal,
    resource.hackathonId as string,
    "admin",
    "coach",
  );
  if (roleCheck instanceof NextResponse) return roleCheck;

  // Determine if this version is the active one
  const pointerId = `rubric-ptr-${resource.hackathonId as string}`;
  const pointer = await queryOne<{ activeRubricId: string }>(
    "SELECT activeRubricId FROM rubric_pointers WHERE id = @id",
    { id: pointerId },
  );
  const isActive = pointer?.activeRubricId === id;

  const record: RubricsAPI.RubricRecord = {
    id: resource.id as string,
    version: resource.version as number,
    categories: JSON.parse(resource.categories as string),
    isActive,
    createdBy: resource.createdBy as string,
    createdAt: resource.createdAt as string,
  };

  const response: ApiResponse<RubricsAPI.RubricRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
