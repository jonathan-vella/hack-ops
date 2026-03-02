import { NextResponse } from "next/server";
import type { RubricsAPI, ApiResponse } from "@hackops/shared";
import { requireAuth, checkRole } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";

export const PATCH = requireAuth(async (_request, context, auth) => {
  const { id } = await context.params;

  // Look up resource first — params.id is a rubric version ID, not a hackathonId
  const rubricVersion = await queryOne<Record<string, unknown>>(
    "SELECT * FROM rubric_versions WHERE id = @id",
    { id },
  );
  if (!rubricVersion) {
    return NextResponse.json(
      { error: "Rubric not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const hackathonId = rubricVersion.hackathonId as string;

  // Role check using the rubric's hackathonId
  const roleCheck = await checkRole(auth.principal, hackathonId, "admin");
  if (roleCheck instanceof NextResponse) return roleCheck;
  const pointerId = `rubric-ptr-${hackathonId}`;
  const now = new Date().toISOString();

  // Atomic pointer swap — update existing pointer or create one
  await execute(
    `MERGE INTO rubric_pointers AS target
     USING (SELECT @id AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN
       UPDATE SET activeRubricId = @activeRubricId, updatedAt = @updatedAt, updatedBy = @updatedBy
     WHEN NOT MATCHED THEN
       INSERT (id, hackathonId, activeRubricId, updatedAt, updatedBy)
       VALUES (@id, @hackathonId, @activeRubricId, @updatedAt, @updatedBy);`,
    {
      id: pointerId,
      hackathonId,
      activeRubricId: id,
      updatedAt: now,
      updatedBy: auth.principal.userId,
    },
  );

  await auditLog({
    hackathonId,
    action: "rubric.activate",
    targetType: "rubric",
    targetId: id,
    performedBy: auth.principal.userId,
    details: { version: rubricVersion.version },
  });

  const record: RubricsAPI.RubricRecord = {
    id: rubricVersion.id as string,
    version: rubricVersion.version as number,
    categories: JSON.parse(rubricVersion.categories as string),
    isActive: true,
    createdBy: rubricVersion.createdBy as string,
    createdAt: rubricVersion.createdAt as string,
  };

  const response: ApiResponse<RubricsAPI.RubricRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
