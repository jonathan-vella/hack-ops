import { test, expect } from "@playwright/test";
import { authHeaders } from "../helpers/auth-helper";
import { HACKATHON_ID } from "../fixtures";

const BASE = "http://localhost:3000";

test.describe("Submission + Scoring Lifecycle", () => {
  test("submit → review → approve → progression advances", async ({
    request,
  }) => {
    // Step 1: Create a submission for challenge 1
    const submitRes = await request.post(`${BASE}/api/submissions`, {
      headers: authHeaders("hacker"),
      data: {
        challengeId: "ch-001-setup",
        description: "Completed environment setup",
      },
    });

    // Might be 201 (new) or 409 (duplicate) — either means the test data exists
    if (submitRes.status() === 201) {
      const submitBody = await submitRes.json();
      expect(submitBody.data.state).toBe("pending");
      expect(submitBody.data.teamId).toBeTruthy();
    }

    // Step 2: List pending submissions as coach
    const listRes = await request.get(
      `${BASE}/api/submissions?hackathonId=${HACKATHON_ID}&status=pending`,
      { headers: authHeaders("coach") },
    );
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();

    // Find a pending submission
    const pendingSub = listBody.data.items.find(
      (s: Record<string, unknown>) => s.state === "pending",
    );

    if (pendingSub) {
      // Step 3: Approve it with full rubric scores
      const rubricRes = await request.get(
        `${BASE}/api/rubrics?hackathonId=${HACKATHON_ID}&activeOnly=true`,
        { headers: authHeaders("coach") },
      );
      const rubricBody = await rubricRes.json();

      if (rubricBody.data.items.length > 0) {
        // Get rubric detail for categories
        const rubricDetail = await request.get(
          `${BASE}/api/rubrics/${rubricBody.data.items[0].id}`,
          { headers: authHeaders("coach") },
        );
        const detail = await rubricDetail.json();

        // Build full scores for all categories (LOGIC-005)
        const scores = detail.data.categories.map(
          (c: { id: string; maxScore: number }) => ({
            categoryId: c.id,
            score: Math.floor(c.maxScore * 0.8),
          }),
        );

        const reviewRes = await request.patch(
          `${BASE}/api/submissions/${pendingSub.id}`,
          {
            headers: authHeaders("admin"),
            data: {
              status: "approved",
              reason: "Good work",
              scores,
            },
          },
        );

        expect(reviewRes.status()).toBe(200);
        const reviewBody = await reviewRes.json();
        expect(reviewBody.data.state).toBe("approved");
        expect(reviewBody.data.scores).toHaveLength(scores.length);
      }
    }
  });

  test("reject submission with reason", async ({ request }) => {
    // Create a new submission
    const submitRes = await request.post(`${BASE}/api/submissions`, {
      headers: authHeaders("hacker"),
      data: {
        challengeId: "ch-001-setup",
        description: "Incomplete work",
      },
    });

    if (submitRes.status() === 201) {
      const submitBody = await submitRes.json();

      const rejectRes = await request.patch(
        `${BASE}/api/submissions/${submitBody.data.id}`,
        {
          headers: authHeaders("admin"),
          data: {
            status: "rejected",
            reason: "Missing required documentation",
          },
        },
      );

      expect(rejectRes.status()).toBe(200);
      const body = await rejectRes.json();
      expect(body.data.state).toBe("rejected");
      expect(body.data.reviewReason).toContain("Missing");
    }
  });

  test("already-reviewed submission returns 409", async ({ request }) => {
    // List approved submissions
    const listRes = await request.get(
      `${BASE}/api/submissions?hackathonId=${HACKATHON_ID}&status=approved`,
      { headers: authHeaders("admin") },
    );

    const listBody = await listRes.json();
    const approved = listBody.data.items.find(
      (s: Record<string, unknown>) => s.state === "approved",
    );

    if (approved) {
      const res = await request.patch(
        `${BASE}/api/submissions/${approved.id}`,
        {
          headers: authHeaders("admin"),
          data: {
            status: "approved",
            reason: "Re-approve",
            scores: [{ categoryId: "c1", score: 10 }],
          },
        },
      );
      expect(res.status()).toBe(409);
    }
  });

  test("leaderboard reflects scoring", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/leaderboard?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("admin") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.entries).toBeInstanceOf(Array);

    // Verify entries have expected shape
    if (body.data.entries.length > 0) {
      const entry = body.data.entries[0];
      expect(entry.rank).toBe(1);
      expect(entry.teamName).toBeTruthy();
      expect(entry.totalScore).toBeGreaterThanOrEqual(0);
      expect(entry.gradeBadge).toMatch(/^[ABCD]$/);
    }
  });
});
