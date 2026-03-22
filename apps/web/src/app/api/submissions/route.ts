import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  SubmissionsAPI,
  ApiResponse,
  PageResponse,
  SubmissionState,
} from "@hackops/shared";
import { requireAuth, requireRole } from "@/lib/guards";
import { query, queryOne, execute } from "@/lib/sql";
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
    // LOGIC-004: Filter by challengeId's hackathon to ensure correct team selection
    const challenge = await queryOne<{ id: string; hackathonId: string }>(
      "SELECT id, hackathonId FROM challenges WHERE id = @cid",
      { cid: body.challengeId },
    );
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found", ok: false },
        { status: 404 },
      );
    }

    const hacker = await queryOne<Record<string, unknown>>(
      "SELECT * FROM hackers WHERE githubUserId = @uid AND hackathonId = @hid",
      { uid: auth.principal.userId, hid: challenge.hackathonId },
    );

    if (!hacker) {
      return NextResponse.json(
        {
          error: "You are not registered as a hacker in this hackathon",
          ok: false,
        },
        { status: 403 },
      );
    }

    if (!hacker.teamId) {
      return NextResponse.json(
        { error: "You are not assigned to a team yet", ok: false },
        { status: 403 },
      );
    }

    const teamId = hacker.teamId as string;
    const hackathonId = hacker.hackathonId as string;

    // Verify the hackathon is active
    const hackathon = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM hackathons WHERE id = @id",
      { id: hackathonId },
    );

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

    await execute(
      `INSERT INTO submissions (id, teamId, hackathonId, challengeId, state, description, attachments, submittedBy, submittedAt, scores, reviewedBy, reviewedAt, reviewReason)
       VALUES (@id, @teamId, @hackathonId, @challengeId, @state, @description, @attachments, @submittedBy, @submittedAt, @scores, @reviewedBy, @reviewedAt, @reviewReason)`,
      {
        id: record.id,
        teamId: record.teamId,
        hackathonId: record.hackathonId,
        challengeId: record.challengeId,
        state: record.state,
        description: record.description,
        attachments: JSON.stringify(record.attachments),
        submittedBy: record.submittedBy,
        submittedAt: record.submittedAt,
        scores: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null,
      },
    );

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
  "hacker",
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

  let sqlText = "SELECT * FROM submissions WHERE hackathonId = @hid";
  const queryParams: Record<string, unknown> = { hid: hackathonId };

  if (status) {
    sqlText += " AND state = @state";
    queryParams.state = status;
  }

  if (teamId) {
    sqlText += " AND teamId = @teamId";
    queryParams.teamId = teamId;
  }

  // LOGIC-013: Hackers can only see their own team's submissions
  if (auth.role === "hacker") {
    const hacker = await queryOne<{ teamId: string }>(
      "SELECT teamId FROM hackers WHERE githubUserId = @uid AND hackathonId = @hid",
      { uid: auth.principal.userId, hid: hackathonId },
    );
    if (!hacker) {
      return NextResponse.json(
        { error: "You are not registered in this hackathon", ok: false },
        { status: 403 },
      );
    }
    if (teamId && teamId !== hacker.teamId) {
      return NextResponse.json(
        { error: "You can only view your own team's submissions", ok: false },
        { status: 403 },
      );
    }
    if (!teamId) {
      queryParams.teamId = hacker.teamId;
      sqlText += " AND teamId = @teamId";
    }
  }

  sqlText +=
    " ORDER BY submittedAt DESC OFFSET 0 ROWS FETCH NEXT @pageSize ROWS ONLY";
  queryParams.pageSize = pageSize;

  const resources = await query<Record<string, unknown>>(sqlText, queryParams);

  const items: SubmissionsAPI.SubmissionRecord[] = resources.map((r) => ({
    id: r.id as string,
    teamId: r.teamId as string,
    hackathonId: r.hackathonId as string,
    challengeId: r.challengeId as string,
    state: r.state as SubmissionState,
    description: r.description as string,
    attachments: r.attachments
      ? (JSON.parse(r.attachments as string) as string[])
      : [],
    submittedBy: r.submittedBy as string,
    submittedAt: r.submittedAt as string,
    scores: r.scores ? JSON.parse(r.scores as string) : null,
    reviewedBy: (r.reviewedBy as string) ?? null,
    reviewedAt: (r.reviewedAt as string) ?? null,
    reviewReason: (r.reviewReason as string) ?? null,
  }));

  const response: ApiResponse<PageResponse<SubmissionsAPI.SubmissionRecord>> = {
    data: { items, continuationToken: null },
    ok: true,
  };
  return NextResponse.json(response);
});
