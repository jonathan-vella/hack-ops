import { test, expect } from "@playwright/test";
import { authHeaders } from "../helpers/auth-helper";
import { HACKATHON_ID } from "../fixtures";

const BASE = "http://localhost:3000";

test.describe("Coach Journey", () => {
  test("GET /api/submissions returns submissions for coach", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/api/submissions?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("coach") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toBeInstanceOf(Array);
  });

  test("coach cannot view submissions for other hackathons", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/api/submissions?hackathonId=some-other-hackathon`,
      { headers: authHeaders("coach") },
    );
    // Coach role resolves against their assigned hackathon, so this should fail
    expect(res.status()).toBe(403);
  });

  test("GET /api/challenges returns challenges for coach", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/api/challenges?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("coach") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/rubrics returns rubrics (including for hacker)", async ({
    request,
  }) => {
    // LOGIC-015: Hackers should also be able to read rubrics
    const hackerRes = await request.get(
      `${BASE}/api/rubrics?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("hacker") },
    );
    expect(hackerRes.status()).toBe(200);

    const coachRes = await request.get(
      `${BASE}/api/rubrics?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("coach") },
    );
    expect(coachRes.status()).toBe(200);
    const body = await coachRes.json();
    expect(body.data.items).toBeInstanceOf(Array);
  });

  test("GET /api/leaderboard returns leaderboard", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/leaderboard?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("coach") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.hackathonId).toBe(HACKATHON_ID);
    expect(body.data.entries).toBeInstanceOf(Array);
  });
});
