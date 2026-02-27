import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { HackathonsAPI, ApiResponse, HackathonStatus } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { updateHackathonSchema } from "@/lib/validation/hackathon";

const VALID_TRANSITIONS: Record<HackathonStatus, HackathonStatus[]> = {
  draft: ["active"],
  active: ["archived"],
  archived: [],
};

export const GET = requireRole("admin", "coach")(
  async (_request, context, _auth) => {
    const { id } = await context.params;
    const container = getContainer("hackathons");

    const { resource } = await container.item(id, id).read();
    if (!resource) {
      return NextResponse.json(
        { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const response: ApiResponse<HackathonsAPI.HackathonRecord> = {
      data: resource as HackathonsAPI.HackathonRecord,
      ok: true,
    };
    return NextResponse.json(response);
  },
);

export const PATCH = requireRole("admin")(
  async (request: NextRequest, context, auth) => {
    const { id } = await context.params;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", ok: false },
        { status: 400 },
      );
    }

    const result = updateHackathonSchema.safeParse(raw);
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

    const body = result.data;
    const container = getContainer("hackathons");
    const { resource: existing } = await container.item(id, id).read();

    if (!existing) {
      return NextResponse.json(
        { error: "Hackathon not found", ok: false } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (body.status) {
      const allowed = VALID_TRANSITIONS[existing.status as HackathonStatus];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid transition: ${existing.status} → ${body.status}. Allowed: ${allowed.join(", ") || "none"}`,
            ok: false,
          },
          { status: 422 },
        );
      }
    }

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.teamSize !== undefined && { teamSize: body.teamSize }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.status === "active" && { launchedAt: now }),
      ...(body.status === "archived" && { archivedAt: now }),
    };

    const { resource: replaced } = await container
      .item(id, id)
      .replace(updated);

    await auditLog({
      hackathonId: id,
      action: "hackathon.update",
      targetType: "hackathon",
      targetId: id,
      performedBy: auth.principal.userId,
      details: body as Record<string, unknown>,
    });

    const response: ApiResponse<HackathonsAPI.HackathonRecord> = {
      data: replaced as HackathonsAPI.HackathonRecord,
      ok: true,
    };
    return NextResponse.json(response);
  },
);