import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../sql", () => ({
  execute: vi.fn().mockResolvedValue(1),
}));

import { auditLog } from "../audit";
import { execute } from "../sql";

const mockExecute = vi.mocked(execute);

describe("auditLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an audit record with all fields", async () => {
    await auditLog({
      hackathonId: "h1",
      action: "submission.approve",
      targetType: "submission",
      targetId: "sub-1",
      performedBy: "user-1",
      reason: "Meets criteria",
      details: { score: 42 },
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sqlText, params] = mockExecute.mock.calls[0];
    expect(sqlText).toContain("INSERT INTO audit_log");
    expect(params?.id).toBeTruthy();
    expect(params?.hackathonId).toBe("h1");
    expect(params?.action).toBe("submission.approve");
    expect(params?.targetType).toBe("submission");
    expect(params?.targetId).toBe("sub-1");
    expect(params?.performedBy).toBe("user-1");
    expect(params?.performedAt).toBeTruthy();
    expect(params?.reason).toBe("Meets criteria");
    expect(params?.details).toBe(JSON.stringify({ score: 42 }));
  });

  it("defaults reason and details to null when omitted", async () => {
    await auditLog({
      hackathonId: "h1",
      action: "role.invite",
      targetType: "role",
      targetId: "role-1",
      performedBy: "admin-1",
    });

    const [, params] = mockExecute.mock.calls[0];
    expect(params?.reason).toBeNull();
    expect(params?.details).toBeNull();
  });
});
