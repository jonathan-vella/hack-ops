import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("../cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: { create: mockCreate },
  })),
}));

import { auditLog } from "../audit";

describe("auditLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an audit record with all fields", async () => {
    mockCreate.mockResolvedValue({ resource: {} });

    await auditLog({
      hackathonId: "h1",
      action: "submission.approve",
      targetType: "submission",
      targetId: "sub-1",
      performedBy: "user-1",
      reason: "Meets criteria",
      details: { score: 42 },
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.id).toBeTruthy();
    expect(arg.hackathonId).toBe("h1");
    expect(arg.action).toBe("submission.approve");
    expect(arg.targetType).toBe("submission");
    expect(arg.targetId).toBe("sub-1");
    expect(arg.performedBy).toBe("user-1");
    expect(arg.performedAt).toBeTruthy();
    expect(arg.reason).toBe("Meets criteria");
    expect(arg.details).toEqual({ score: 42 });
  });

  it("defaults reason and details to null when omitted", async () => {
    mockCreate.mockResolvedValue({ resource: {} });

    await auditLog({
      hackathonId: "h1",
      action: "role.invite",
      targetType: "role",
      targetId: "role-1",
      performedBy: "admin-1",
    });

    const arg = mockCreate.mock.calls[0][0];
    expect(arg.reason).toBeNull();
    expect(arg.details).toBeNull();
  });
});
