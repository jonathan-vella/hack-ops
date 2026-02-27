import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  SubmissionsAPI,
  ApiResponse,
  PageResponse,
  SubmissionState,
} from "@hackops/shared";
import { requireAuth, requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { checkChallengeGate } from "@/lib/challenge-gate";
import {
  createSubmissionSchema,
  listSubmissionsSchema,
} from "@/lib/validation/submission";

export const POST = requireAuth(
  async (request: NextRequest, _context, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", ok: false },
        { status: 400 },
      );
    }

    const result = createSubmissionSchema.safeParse(raw);
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

    // Look up the hacker record to get their team and hackathon
    const hackersContainer = getContainer("hackers");
    const { resources: hackerRecords } = await hackersContainer.items
      .query({
        query:
          "SELECT * FROM c WHERE c._type = 'hacker' AND c.githubUserId = @uid",
        parameters: [{ name: "@uid", value: auth.principal.userId }],
      })
      .fetchAll();

    if (hackerRecords.length === 0) {
      return NextResponse.json(
        {
          error: "You are not registered as a hacker in any hackathon",
          ok: false,
        },
        { status: 403 },
      );
    }

    // Find a hacker record that has a team assignment
    const hacker = hackerRecords.find(
      (h: Record<string, unknown>) => h.teamId != null,
    );
    if (!hacker) {
      return NextResponse.json(
        { error: "You are not assigned to a team yet", ok: false },
        { status: 403 },
      );
    }

    const teamId = hacker.teamId as string;
    const hackathonId = hacker.hackathonId as string;

    // Verify the hackathon is active
    const hackathonsContainer = getContainer("hackathons");
    const { resource: hackathon } = await hackathonsContainer
      .item(hackathonId, hackathonId)
      .read();

    if (!hackathon || hackathon.status !== "active") {
      return NextResponse.json(
        { error: "Hackathon is not active", ok: false },
        { status: 422 },
      );
    }

    // Gate check: reject submissions for locked challenges
    const gateResult = await checkChallengeGate(
      teamId,
      hackathonId,
      body.challengeId,
    );
    if (!gateResult.allowed) {
      return NextResponse.json(
        { error: gateResult.reason ?? "Challenge is locked", ok: false },
        { status: 403 },
      );
    }

    const container = getContainer("submissions");
    const now = new Date().toISOString();

    const record: SubmissionsAPI.SubmissionRecord = {
      id: crypto.randomUUID(),
      teamId,
      hackathonId,
      challengeId: body.challengeId,
      state: "pending",
      description: body.description,
      attachments: body.attachments ?? [],
      submittedBy: auth.principal.userId,
      submittedAt: now,
      scores: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    };

    await container.items.create({
      ...record,
      _type: "submission",
    });

    await auditLog({
      hackathonId,
      action: "submission.create",
      targetType: "submission",
      targetId: record.id,
      performedBy: auth.principal.userId,
      details: { challengeId: body.challengeId, teamId },
    });

    const response: ApiResponse<SubmissionsAPI.SubmissionRecord> = {
      data: record,
      ok: true,
    };
    return NextResponse.json(response, { status: 201 });
  },
);

export const GET = requireRole(
  "admin",
  "coach",
)(async (request: NextRequest, _context, auth) => {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parseResult = listSubmissionsSchema.safeParse(params);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parseResult.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
        ok: false,
      },
      { status: 400 },
    );
  }

  const {
    hackathonId,
    status,
    teamId,
    pageSize: rawPageSize,
  } = parseResult.data;

  // Coaches only see submissions for their assigned hackathon
  if (auth.role === "coach" && hackathonId !== auth.hackathonId) {
    return NextResponse.json(
      {
        error: "Coaches can only view submissions for their assigned hackathon",
        ok: false,
      },
      { status: 403 },
    );
  }

  const pageSize = Math.min(rawPageSize ?? 20, 100);

  let query =
    "SELECT * FROM c WHERE c._type = 'submission' AND c.hackathonId = @hid";
  const queryParams: Array<{ name: string; value: string }> = [
    { name: "@hid", value: hackathonId },
  ];

  if (status) {
    query += " AND c.state = @state";
    queryParams.push({ name: "@state", value: status });
  }

  if (teamId) {
    query += " AND c.teamId = @teamId";
    queryParams.push({ name: "@teamId", value: teamId });
  }

  query += " ORDER BY c.submittedAt DESC";

  const container = getContainer("submissions");
  const iterator = container.items.query(
    { query, parameters: queryParams },
    { maxItemCount: pageSize },
  );
  const { resources, continuationToken } = await iterator.fetchNext();

  const items: SubmissionsAPI.SubmissionRecord[] = resources.map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      teamId: r.teamId as string,
      hackathonId: r.hackathonId as string,
      challengeId: r.challengeId as string,
      state: r.state as SubmissionState,
      description: r.description as string,
      attachments: r.attachments as string[],
      submittedBy: r.submittedBy as string,
      submittedAt: r.submittedAt as string,
      scores: (r.scores as SubmissionsAPI.SubmissionRecord["scores"]) ?? null,
      reviewedBy: (r.reviewedBy as string) ?? null,
      reviewedAt: (r.reviewedAt as string) ?? null,
      reviewReason: (r.reviewReason as string) ?? null,
    }),
  );

  const response: ApiResponse<PageResponse<SubmissionsAPI.SubmissionRecord>> = {
    data: { items, continuationToken: continuationToken ?? null },
    ok: true,
  };
  return NextResponse.json(response);
});
