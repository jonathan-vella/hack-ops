import { test, expect } from "@playwright/test";
import { authHeaders } from "../helpers/auth-helper";
import { HACKATHON_ID, EVENT_CODE } from "../fixtures";

const BASE = "http://localhost:3000";

test.describe("Hacker Journey", () => {
  test("GET /api/me returns current user info", async ({ request }) => {
    const res = await request.get(`${BASE}/api/me`, {
      headers: authHeaders("hacker"),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.principal).toBeTruthy();
    expect(body.data.principal.userId).toBeTruthy();
    expect(body.data.roles).toBeInstanceOf(Array);
  });

  test("GET /api/progression returns own team's progression", async ({
    request,
  }) => {
    // First get the hacker's team
    const meRes = await request.get(`${BASE}/api/me`, {
      headers: authHeaders("hacker"),
    });
    const me = await meRes.json();

    // Get progression for own team (SEC-004: ownership enforced)
    const res = await request.get(
      `${BASE}/api/progression?hackathonId=${HACKATHON_ID}&teamId=team-alpha-4821`,
      { headers: authHeaders("hacker") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.currentChallenge).toBeGreaterThanOrEqual(1);
    expect(body.data.unlockedChallenges).toBeInstanceOf(Array);
  });

  test("hacker cannot view another team's progression", async ({ request }) => {
    // SEC-004: Attempt to view a different team's progression
    const res = await request.get(
      `${BASE}/api/progression?hackathonId=${HACKATHON_ID}&teamId=non-existent-team`,
      { headers: authHeaders("hacker") },
    );
    expect(res.status()).toBe(403);
  });

  test("GET /api/submissions returns only own team's submissions for hacker", async ({
    request,
  }) => {
    // LOGIC-013: Hackers can list their own team's submissions
    const res = await request.get(
      `${BASE}/api/submissions?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("hacker") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items).toBeInstanceOf(Array);
  });

  test("GET /api/challenges returns challenges for hacker", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/api/challenges?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("hacker") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  test("POST /api/join rejects invalid event code with 401", async ({
    request,
  }) => {
    // LOGIC-011: Invalid event code returns 401
    const res = await request.post(`${BASE}/api/join`, {
      headers: authHeaders("hacker"),
      data: { eventCode: "9999" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid or expired");
  });

  test("POST /api/join rejects already-joined hacker with 409", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/join`, {
      headers: authHeaders("hacker"),
      data: { eventCode: EVENT_CODE },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Already joined");
  });

  test("POST /api/join rate limits after 5 attempts", async ({ request }) => {
    const results: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request.post(`${BASE}/api/join`, {
        headers: authHeaders("hacker"),
        data: { eventCode: "0000" },
      });
      results.push(res.status());
    }
    // At least one should be rate-limited (429)
    expect(results).toContain(429);
  });
});
