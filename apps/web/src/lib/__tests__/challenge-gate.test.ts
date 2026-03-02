import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../sql", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

import { checkChallengeGate, advanceProgression } from "../challenge-gate";
import { queryOne, execute } from "../sql";

const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);

describe("checkChallengeGate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns allowed:true when challenge order <= currentChallenge", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ order: 1 })
      .mockResolvedValueOnce({
        currentChallenge: 2,
        rowVersion: Buffer.from("v1"),
      });

    const result = await checkChallengeGate("team-1", "h1", "ch-1");

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns allowed:false when challenge is locked", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ order: 3 })
      .mockResolvedValueOnce({
        currentChallenge: 2,
        rowVersion: Buffer.from("v1"),
      });

    const result = await checkChallengeGate("team-1", "h1", "ch-3");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("locked");
  });

  it("returns allowed:false when challenge not found", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const result = await checkChallengeGate("team-1", "h1", "nonexistent");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Challenge not found");
  });

  it("returns allowed:false when no progression record exists", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ order: 1 })
      .mockResolvedValueOnce(null);

    const result = await checkChallengeGate("team-1", "h1", "ch-1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No progression record");
  });

  it("allows current challenge (order === currentChallenge)", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ order: 2 })
      .mockResolvedValueOnce({
        currentChallenge: 2,
        rowVersion: Buffer.from("v1"),
      });

    const result = await checkChallengeGate("team-1", "h1", "ch-2");

    expect(result.allowed).toBe(true);
  });
});

describe("advanceProgression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("advances when approved challenge matches currentChallenge", async () => {
    mockQueryOne.mockResolvedValueOnce({ order: 2 }).mockResolvedValueOnce({
      id: "prog-1",
      currentChallenge: 2,
      unlockedChallenges: JSON.stringify([
        { challengeId: "ch-1", unlockedAt: "2025-01-01T00:00:00Z" },
      ]),
      rowVersion: Buffer.from("v1"),
    });
    mockExecute.mockResolvedValueOnce(1);

    await advanceProgression("team-1", "h1", "ch-2");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sqlText, params] = mockExecute.mock.calls[0];
    expect(sqlText).toContain("UPDATE progressions");
    expect(params?.nextChallenge).toBe(3);
  });

  it("does not advance when challenge order !== currentChallenge", async () => {
    mockQueryOne.mockResolvedValueOnce({ order: 1 }).mockResolvedValueOnce({
      id: "prog-1",
      currentChallenge: 2,
      unlockedChallenges: "[]",
      rowVersion: Buffer.from("v1"),
    });

    await advanceProgression("team-1", "h1", "ch-1");

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("proceeds normally with malformed unlockedChallenges JSON", async () => {
    mockQueryOne.mockResolvedValueOnce({ order: 2 }).mockResolvedValueOnce({
      id: "prog-1",
      currentChallenge: 2,
      unlockedChallenges: "INVALID_JSON{{{",
      rowVersion: Buffer.from("v1"),
    });
    mockExecute.mockResolvedValueOnce(1);

    await expect(
      advanceProgression("team-1", "h1", "ch-2"),
    ).resolves.toBeUndefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, params] = mockExecute.mock.calls[0];
    expect(params?.nextChallenge).toBe(3);
  });

  it("proceeds normally when unlockedChallenges is null", async () => {
    mockQueryOne.mockResolvedValueOnce({ order: 2 }).mockResolvedValueOnce({
      id: "prog-1",
      currentChallenge: 2,
      unlockedChallenges: null,
      rowVersion: Buffer.from("v1"),
    });
    mockExecute.mockResolvedValueOnce(1);

    await expect(
      advanceProgression("team-1", "h1", "ch-2"),
    ).resolves.toBeUndefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [, params] = mockExecute.mock.calls[0];
    expect(params?.nextChallenge).toBe(3);
  });

  it("does nothing when challenge not found", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await advanceProgression("team-1", "h1", "nonexistent");

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("does nothing when no progression record", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ order: 1 })
      .mockResolvedValueOnce(null);

    await advanceProgression("team-1", "h1", "ch-1");

    expect(mockExecute).not.toHaveBeenCalled();
  });
});
