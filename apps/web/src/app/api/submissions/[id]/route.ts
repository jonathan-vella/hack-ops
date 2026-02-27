import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  SubmissionsAPI,
  ScoresAPI,
  ApiResponse,
  CategoryScore,
} from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { reviewSubmissionSchema } from "@/lib/validation/submission";

export const PATCH = requireRole(
  "admin",
  "coach",
)(async (request: NextRequest, context, auth) => {
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
  const container = getContainer("submissions");

  // Find submission — cross-partition query (submissions partitioned by teamId)
  const { resources: submissions } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c._type = 'submission'",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  if (submissions.length === 0) {
    return NextResponse.json(
      { error: "Submission not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const submission = submissions[0];

  if (submission.state !== "pending") {
    return NextResponse.json(
      {
        error: `Submission already ${submission.state}. Only pending submissions can be reviewed.`,
        ok: false,
      },
      { status: 409 },
    );
  }

  // Coaches can only review submissions for their assigned hackathon
  if (
    auth.role === "coach" &&
    submission.hackathonId !== auth.hackathonId
  ) {
    return NextResponse.json(
      { error: "Coaches can only review submissions for their assigned hackathon", ok: false },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();

  if (body.status === "approved") {
    if (!body.scores || body.scores.length === 0) {
      return NextResponse.json(
        { error: "Scores are required when approving a submission", ok: false },
        { status: 400 },
      );
    }

    // Validate scores against the active rubric
    const rubricsContainer = getContainer("rubrics");
    const pointerId = `rubric-ptr-${submission.hackathonId}`;
    const { resource: pointer } = await rubricsContainer
      .item(pointerId, pointerId)
      .read();

    if (!pointer) {
      return NextResponse.json(
        { error: "No active rubric found for this hackathon", ok: false },
        { status: 422 },
      );
    }

    const { resource: rubric } = await rubricsContainer
      .item(pointer.activeRubricId, pointer.activeRubricId)
      .read();

    if (!rubric) {
      return NextResponse.json(
        { error: "Active rubric version not found", ok: false },
        { status: 422 },
      );
    }

    // Validate each category score does not exceed maxScore
    const categories = rubric.categories as Array<{
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
    const updatedSubmission = {
      ...submission,
      state: "approved",
      scores: body.scores,
      reviewedBy: auth.principal.userId,
      reviewedAt: now,
      reviewReason: body.reason,
    };
    await container
      .item(id, submission.teamId)
      .replace(updatedSubmission);

    // Create immutable score record in scores container
    const scoresContainer = getContainer("scores");
    const total = body.scores.reduce(
      (sum: number, s: CategoryScore) => sum + s.score,
      0,
    );

    const scoreRecord: ScoresAPI.ScoreRecord & {
      _type: string;
      overriddenBy: null;
      overriddenAt: null;
      overrideReason: null;
    } = {
      id: `score-${id}`,
      _type: "score",
      teamId: submission.teamId,
      hackathonId: submission.hackathonId,
      challengeId: submission.challengeId,
      submissionId: id,
      categoryScores: body.scores,
      total,
      approvedBy: auth.principal.userId,
      approvedAt: now,
      overriddenBy: null,
      overriddenAt: null,
      overrideReason: null,
    };
    await scoresContainer.items.create(scoreRecord);

    await auditLog({
      hackathonId: submission.hackathonId,
      action: "submission.approve",
      targetType: "submission",
      targetId: id,
      performedBy: auth.principal.userId,
      reason: body.reason,
      details: { scores: body.scores, total, teamId: submission.teamId },
    });

    const record: SubmissionsAPI.SubmissionRecord = {
      id: updatedSubmission.id,
      teamId: updatedSubmission.teamId,
      hackathonId: updatedSubmission.hackathonId,
      challengeId: updatedSubmission.challengeId,
      state: "approved",
      description: updatedSubmission.description,
      attachments: updatedSubmission.attachments,
      submittedBy: updatedSubmission.submittedBy,
      submittedAt: updatedSubmission.submittedAt,
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
  const updatedSubmission = {
    ...submission,
    state: "rejected",
    reviewedBy: auth.principal.userId,
    reviewedAt: now,
    reviewReason: body.reason,
  };
  await container
    .item(id, submission.teamId)
    .replace(updatedSubmission);

  await auditLog({
    hackathonId: submission.hackathonId,
    action: "submission.reject",
    targetType: "submission",
    targetId: id,
    performedBy: auth.principal.userId,
    reason: body.reason,
    details: { teamId: submission.teamId },
  });

  const record: SubmissionsAPI.SubmissionRecord = {
    id: updatedSubmission.id,
    teamId: updatedSubmission.teamId,
    hackathonId: updatedSubmission.hackathonId,
    challengeId: updatedSubmission.challengeId,
    state: "rejected",
    description: updatedSubmission.description,
    attachments: updatedSubmission.attachments,
    submittedBy: updatedSubmission.submittedBy,
    submittedAt: updatedSubmission.submittedAt,
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
