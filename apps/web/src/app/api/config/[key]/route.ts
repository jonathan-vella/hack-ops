import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ConfigAPI, ApiResponse } from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { isGlobalAdmin } from "@/lib/roles";
import { updateConfigSchema, isReadOnlyKey } from "@/lib/validation/config";

export const PATCH = requireAuth(async (
  request: NextRequest,
  context,
  auth,
) => {
  const isAdmin = await isGlobalAdmin(auth.principal.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Access denied. Required role: admin", ok: false },
      { status: 403 },
    );
  }

  const { key } = await context.params;

  if (isReadOnlyKey(key)) {
    return NextResponse.json(
      { error: `Config key "${key}" is read-only`, ok: false },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = updateConfigSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
        ok: false,
      },
      { status: 400 },
    );
  }

  const container = getContainer("config");
  const configId = `cfg-${key}`;

  const { resource: existing } = await container
    .item(configId, configId)
    .read();

  if (!existing) {
    return NextResponse.json(
      { error: "Config key not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const oldValue = existing.value;

  const updated = {
    ...existing,
    value: result.data.value,
    updatedBy: auth.principal.userId,
    updatedAt: now,
  };

  await container.item(configId, configId).replace(updated);

  await auditLog({
    hackathonId: "global",
    action: "config.update",
    targetType: "config",
    targetId: key,
    performedBy: auth.principal.userId,
    details: { key, oldValue, newValue: result.data.value },
  });

  const record: ConfigAPI.ConfigRecord = {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    updatedBy: updated.updatedBy,
    updatedAt: updated.updatedAt,
  };

  const response: ApiResponse<ConfigAPI.ConfigRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
