import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ConfigAPI, ApiResponse } from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { isGlobalAdmin } from "@/lib/roles";
import { updateConfigSchema, isReadOnlyKey } from "@/lib/validation/config";

export const PATCH = requireAuth(
  async (request: NextRequest, context, auth) => {
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

    const configId = `cfg-${key}`;

    const existing = await queryOne<ConfigAPI.ConfigRecord>(
      "SELECT * FROM config WHERE id = @id",
      { id: configId },
    );

    if (!existing) {
      return NextResponse.json(
        {
          error: "Config key not found",
          ok: false,
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const oldValue = existing.value;

    await execute(
      "UPDATE config SET value = @value, updatedBy = @updatedBy, updatedAt = @updatedAt WHERE id = @id",
      {
        value: result.data.value,
        updatedBy: auth.principal.userId,
        updatedAt: now,
        id: configId,
      },
    );

    await auditLog({
      hackathonId: "global",
      action: "config.update",
      targetType: "config",
      targetId: key,
      performedBy: auth.principal.userId,
      details: { key, oldValue, newValue: result.data.value },
    });

    const record: ConfigAPI.ConfigRecord = {
      id: existing.id,
      key: existing.key,
      value: result.data.value,
      updatedBy: auth.principal.userId,
      updatedAt: now,
    };

    const response: ApiResponse<ConfigAPI.ConfigRecord> = {
      data: record,
      ok: true,
    };
    return NextResponse.json(response);
  },
);
