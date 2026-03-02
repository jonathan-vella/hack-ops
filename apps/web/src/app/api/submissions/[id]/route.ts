import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  SubmissionsAPI,
  ApiResponse,
  CategoryScore,
} from "@hackops/shared";
import { requireAuth, checkRole } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { advanceProgression } from "@/lib/challenge-gate";
import { reviewSubmissionSchema } from "@/lib/validation/submission";

export const PATCH = requireAuth(async (request: NextRequest, context, auth) => {
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

  const result = reviewSubmissionSchema.safeParse(raw);
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

  // Find submission — must look up resource before role check
  // because params.id is a submission ID, not a hackathonId
  const submission = await queryOne<Record<string, unknown>>(
    "SELECT * FROM submissions WHERE id = @id",
    { id },
  );

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Role check using the submission's hackathonId (not params.id)
  const hackathonId = submission.hackathonId as string;
  const roleCheck = await checkRole(auth.principal, hackathonId, "admin", "coach");
  if (roleCheck instanceof NextResponse) return roleCheck;

  if (submission.state !== "pending") {
    return NextResponse.json(
      {
        error: `Submission already ${submission.state}. Only pending submissions can be reviewed.`,
        ok: false,
      },
      { status: 409 },
    );
  }

  // Coaches can only review submissions for their assigned hackathon.
  // Coach's role was resolved against this hackathonId via checkRole above,
  // so no additional cross-hackathon check is needed.

  const now = new Date().toISOString();

  if (body.status === "approved") {
    if (!body.scores || body.scores.length === 0) {
      return NextResponse.json(
        { error: "Scores are required when approving a submission", ok: false },
        { status: 400 },
      );
    }

    // Validate scores against the active rubric
    const pointerId = `rubric-ptr-${submission.hackathonId as string}`;
    const pointer = await queryOne<{ activeRubricId: string }>(
      "SELECT activeRubricId FROM rubric_pointers WHERE id = @id",
      { id: pointerId },
    );

    if (!pointer) {
      return NextResponse.json(
        { error: "No active rubric found for this hackathon", ok: false },
        { status: 422 },
      );
    }

    const rubric = await queryOne<{ categories: string }>(
      "SELECT categories FROM rubric_versions WHERE id = @id",
      { id: pointer.activeRubricId },
    );

    if (!rubric) {
      return NextResponse.json(
        { error: "Active rubric version not found", ok: false },
        { status: 422 },
      );
    }

    // Validate each category score does not exceed maxScore
    const categories = JSON.parse(rubric.categories) as Array<{
      id: string;
      maxScore: number;
    }>;
    for (const scoreEntry of body.scores) {
      const category = categories.find((c) => c.id === scoreEntry.categoryId);
      if (!category) {
        return NextResponse.json(
          {
            error: `Unknown rubric category: ${scoreEntry.categoryId}`,
            ok: false,
          },
          { status: 400 },
        );
      }
      if (scoreEntry.score > category.maxScore) {
        return NextResponse.json(
          {
            error: `Score ${scoreEntry.score} exceeds max ${category.maxScore} for category ${scoreEntry.categoryId}`,
            ok: false,
          },
          { status: 400 },
        );
      }
    }

    // Update submission to approved
    await execute(
      `UPDATE submissions
       SET state = 'approved', scores = @scores, reviewedBy = @reviewedBy, reviewedAt = @reviewedAt, reviewReason = @reviewReason
       WHERE id = @id`,
      {
        scores: JSON.stringify(body.scores),
        reviewedBy: auth.principal.userId,
        reviewedAt: now,
        reviewReason: body.reason,
        id,
      },
    );

    // Create immutable score record in scores table
    const total = body.scores.reduce(
      (sum: number, s: CategoryScore) => sum + s.score,
      0,
    );

    await execute(
      `INSERT INTO scores (id, teamId, hackathonId, challengeId, submissionId, categoryScores, total, approvedBy, approvedAt, overriddenBy, overriddenAt, overrideReason)
       VALUES (@id, @teamId, @hackathonId, @challengeId, @submissionId, @categoryScores, @total, @approvedBy, @approvedAt, @overriddenBy, @overriddenAt, @overrideReason)`,
      {
        id: `score-${id}`,
        teamId: submission.teamId,
        hackathonId: submission.hackathonId,
        challengeId: submission.challengeId,
        submissionId: id,
        categoryScores: JSON.stringify(body.scores),
        total,
        approvedBy: auth.principal.userId,
        approvedAt: now,
        overriddenBy: null,
        overriddenAt: null,
        overrideReason: null,
      },
    );

    await auditLog({
      hackathonId: submission.hackathonId as string,
      action: "submission.approve",
      targetType: "submission",
      targetId: id,
      performedBy: auth.principal.userId,
      reason: body.reason,
      details: { scores: body.scores, total, teamId: submission.teamId },
    });

    // Auto-unlock next challenge; non-fatal — approval and score are already committed
    try {
      await advanceProgression(
        submission.teamId as string,
        submission.hackathonId as string,
        submission.challengeId as string,
      );
    } catch {
      // Progression failure must not roll back an approved submission
    }

    const record: SubmissionsAPI.SubmissionRecord = {
      id: submission.id as string,
      teamId: submission.teamId as string,
      hackathonId: submission.hackathonId as string,
      challengeId: submission.challengeId as string,
      state: "approved",
      description: submission.description as string,
      attachments: submission.attachments
        ? JSON.parse(submission.attachments as string)
        : [],
      submittedBy: submission.submittedBy as string,
      submittedAt: submission.submittedAt as string,
      scores: body.scores,
      reviewedBy: auth.principal.userId,
      reviewedAt: now,
      reviewReason: body.reason,
    };

    const response: ApiResponse<SubmissionsAPI.SubmissionRecord> = {
      data: record,
      ok: true,
    };
    return NextResponse.json(response);
  }

  // Rejection path
  await execute(
    `UPDATE submissions
     SET state = 'rejected', reviewedBy = @reviewedBy, reviewedAt = @reviewedAt, reviewReason = @reviewReason
     WHERE id = @id`,
    {
      reviewedBy: auth.principal.userId,
      reviewedAt: now,
      reviewReason: body.reason,
      id,
    },
  );

  await auditLog({
    hackathonId: submission.hackathonId as string,
    action: "submission.reject",
    targetType: "submission",
    targetId: id,
    performedBy: auth.principal.userId,
    reason: body.reason,
    details: { teamId: submission.teamId },
  });

  const record: SubmissionsAPI.SubmissionRecord = {
    id: submission.id as string,
    teamId: submission.teamId as string,
    hackathonId: submission.hackathonId as string,
    challengeId: submission.challengeId as string,
    state: "rejected",
    description: submission.description as string,
    attachments: submission.attachments
      ? JSON.parse(submission.attachments as string)
      : [],
    submittedBy: submission.submittedBy as string,
    submittedAt: submission.submittedAt as string,
    scores: null,
    reviewedBy: auth.principal.userId,
    reviewedAt: now,
    reviewReason: body.reason,
  };

  const response: ApiResponse<SubmissionsAPI.SubmissionRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
