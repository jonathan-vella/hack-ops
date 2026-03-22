import { test, expect } from "@playwright/test";
import { authHeaders } from "../helpers/auth-helper";
import { HACKATHON_ID, EVENT_CODE, ADMIN_USER_ID } from "../fixtures";

const BASE = "http://localhost:3000";

test.describe("Admin Journey", () => {
  test("GET /api/hackathons returns paginated list for admin", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/hackathons`, {
      headers: authHeaders("admin"),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toBeInstanceOf(Array);
    // Event code should be stripped from list responses
    for (const item of body.data.items) {
      expect(item.eventCode).toBeUndefined();
    }
  });

  test("GET /api/hackathons/:id returns full detail for admin", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/hackathons/${HACKATHON_ID}`, {
      headers: authHeaders("admin"),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(HACKATHON_ID);
    expect(body.data.status).toBe("active");
    expect(body.data.eventCode).toBe(EVENT_CODE);
    expect(body.data.launchedAt).toBeTruthy();
  });

  test("GET /api/challenges returns ordered challenges", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/api/challenges?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("admin") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(2);
    // Verify ordering
    for (let i = 1; i < body.data.items.length; i++) {
      expect(body.data.items[i].order).toBeGreaterThan(
        body.data.items[i - 1].order,
      );
    }
  });

  test("GET /api/audit/:hackathonId returns audit trail", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/audit/${HACKATHON_ID}`, {
      headers: authHeaders("admin"),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items).toBeInstanceOf(Array);
    // Audit entries have required fields
    if (body.data.items.length > 0) {
      const entry = body.data.items[0];
      expect(entry.id).toBeTruthy();
      expect(entry.action).toBeTruthy();
      expect(entry.performedBy).toBeTruthy();
      expect(entry.performedAt).toBeTruthy();
    }
  });

  test("GET /api/teams returns teams for admin", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/teams?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("admin") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items).toBeInstanceOf(Array);
    if (body.data.items.length > 0) {
      expect(body.data.items[0].members).toBeInstanceOf(Array);
    }
  });

  test("GET /api/rubrics returns rubrics for admin", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/rubrics?hackathonId=${HACKATHON_ID}`,
      { headers: authHeaders("admin") },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items).toBeInstanceOf(Array);
  });

  test("assign-teams rejects when hackathon is not active", async ({
    request,
  }) => {
    // Create a draft hackathon first
    const createRes = await request.post(`${BASE}/api/hackathons`, {
      headers: authHeaders("admin"),
      data: { name: "Draft Test Hack", description: "For testing" },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const draftId = created.data.id;

    // Try to assign teams on draft hackathon
    const res = await request.post(
      `${BASE}/api/hackathons/${draftId}/assign-teams`,
      {
        headers: authHeaders("admin"),
        data: {},
      },
    );
    // Should get 409 because hackathon is not active (LOGIC-003)
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("active");
  });

  test("hackathon state transition: draft → active is valid", async ({
    request,
  }) => {
    // Create a new hackathon
    const createRes = await request.post(`${BASE}/api/hackathons`, {
      headers: authHeaders("admin"),
      data: { name: "Transition Test", description: "Test" },
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Activate it
    const res = await request.patch(`${BASE}/api/hackathons/${id}`, {
      headers: authHeaders("admin"),
      data: { status: "active" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("active");
    expect(body.data.launchedAt).toBeTruthy();
  });

  test("hackathon state transition: draft → archived is rejected", async ({
    request,
  }) => {
    const createRes = await request.post(`${BASE}/api/hackathons`, {
      headers: authHeaders("admin"),
      data: { name: "Bad Transition", description: "Test" },
    });
    const created = await createRes.json();
    const id = created.data.id;

    const res = await request.patch(`${BASE}/api/hackathons/${id}`, {
      headers: authHeaders("admin"),
      data: { status: "archived" },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Invalid transition");
  });
});
