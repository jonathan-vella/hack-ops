import { NextResponse } from "next/server";
import type { RubricsAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";

export const PATCH = requireRole("admin")(async (_request, context, auth) => {
  const { id } = await context.params;
  const container = getContainer("rubrics");

  // Verify the target rubric version exists
  const { resource: rubricVersion } = await container.item(id, id).read();
  if (!rubricVersion || rubricVersion._type !== "rubric-version") {
    return NextResponse.json(
      { error: "Rubric not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const hackathonId = rubricVersion.hackathonId as string;
  const pointerId = `rubric-ptr-${hackathonId}`;
  const now = new Date().toISOString();

  // Atomic pointer swap — update existing pointer or create one
  const { resource: pointer } = await container
    .item(pointerId, pointerId)
    .read();

  if (pointer) {
    await container.item(pointerId, pointerId).replace({
      ...pointer,
      activeRubricId: id,
      updatedAt: now,
      updatedBy: auth.principal.userId,
    });
  } else {
    await container.items.create({
      id: pointerId,
      _type: "rubric-pointer",
      hackathonId,
      activeRubricId: id,
      updatedAt: now,
      updatedBy: auth.principal.userId,
    });
  }

  await auditLog({
    hackathonId,
    action: "rubric.activate",
    targetType: "rubric",
    targetId: id,
    performedBy: auth.principal.userId,
    details: { version: rubricVersion.version },
  });

  const record: RubricsAPI.RubricRecord = {
    id: rubricVersion.id,
    version: rubricVersion.version,
    categories: rubricVersion.categories,
    isActive: true,
    createdBy: rubricVersion.createdBy,
    createdAt: rubricVersion.createdAt,
  };

  const response: ApiResponse<RubricsAPI.RubricRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
