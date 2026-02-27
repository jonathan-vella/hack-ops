import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "../validation/middleware";

const TestSchema = z.object({
  name: z.string(),
  count: z.number(),
});

const defaultContext = { params: Promise.resolve({}) };

describe("withValidation", () => {
  it("calls handler with parsed body on valid input", async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true }),
    );
    const wrapped = withValidation(TestSchema)(handler);
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "hello", count: 42 }),
    });

    const res = await wrapped(req, defaultContext);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    const body = handler.mock.calls[0][2];
    expect(body).toEqual({ name: "hello", count: 42 });
  });

  it("returns 400 for invalid JSON body", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(TestSchema)(handler);
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{",
    });

    const res = await wrapped(req, defaultContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 400 with issues for schema violation", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(TestSchema)(handler);
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 123, count: "not-a-number" }),
    });

    const res = await wrapped(req, defaultContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns 400 when required fields are missing", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(TestSchema)(handler);
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await wrapped(req, defaultContext);
    expect(res.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
});
