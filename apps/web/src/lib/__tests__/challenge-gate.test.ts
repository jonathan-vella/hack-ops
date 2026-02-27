import { describe, it, expect, vi, beforeEach } from "vitest";

const challengeQuery = vi.fn();
const progressionQuery = vi.fn();
const progressionReplace = vi.fn();

vi.mock("../cosmos", () => ({
  getContainer: vi.fn((name: string) => {
    if (name === "challenges") {
      return { items: { query: challengeQuery } };
    }
    if (name === "progression") {
      return {
        items: { query: progressionQuery },
        item: vi.fn(() => ({ replace: progressionReplace })),
      };
    }
    return { items: { query: vi.fn() } };
  }),
}));

import { checkChallengeGate, advanceProgression } from "../challenge-gate";

function emptyFetchAll(resources: unknown[] = []) {
  return { fetchAll: vi.fn().mockResolvedValue({ resources }) };
}

describe("checkChallengeGate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns allowed:true when challenge order <= currentChallenge", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));
    progressionQuery.mockReturnValue(emptyFetchAll([{ currentChallenge: 2 }]));

    const result = await checkChallengeGate("team-1", "h1", "ch-1");

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns allowed:false when challenge is locked", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 3 }]));
    progressionQuery.mockReturnValue(emptyFetchAll([{ currentChallenge: 2 }]));

    const result = await checkChallengeGate("team-1", "h1", "ch-3");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("locked");
  });

  it("returns allowed:false when challenge not found", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([]));

    const result = await checkChallengeGate("team-1", "h1", "nonexistent");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Challenge not found");
  });

  it("returns allowed:false when no progression record exists", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));
    progressionQuery.mockReturnValue(emptyFetchAll([]));

    const result = await checkChallengeGate("team-1", "h1", "ch-1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No progression record");
  });

  it("allows current challenge (order === currentChallenge)", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 2 }]));
    progressionQuery.mockReturnValue(emptyFetchAll([{ currentChallenge: 2 }]));

    const result = await checkChallengeGate("team-1", "h1", "ch-2");

    expect(result.allowed).toBe(true);
  });
});

describe("advanceProgression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("advances when approved challenge matches currentChallenge", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 2 }]));
    progressionQuery.mockReturnValue(
      emptyFetchAll([
        {
          id: "prog-1",
          currentChallenge: 2,
          unlockedChallenges: [
            { challengeId: "ch-1", unlockedAt: "2025-01-01T00:00:00Z" },
          ],
          _etag: "etag-1",
        },
      ]),
    );
    progressionReplace.mockResolvedValue({ resource: {} });

    await advanceProgression("team-1", "h1", "ch-2");

    expect(progressionReplace).toHaveBeenCalledTimes(1);
    const [updated, options] = progressionReplace.mock.calls[0];
    expect(updated.currentChallenge).toBe(3);
    expect(updated.unlockedChallenges).toHaveLength(2);
    expect(options.accessCondition.condition).toBe("etag-1");
  });

  it("does not advance when challenge order !== currentChallenge", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));
    progressionQuery.mockReturnValue(
      emptyFetchAll([
        {
          id: "prog-1",
          currentChallenge: 2,
          unlockedChallenges: [],
          _etag: "etag-1",
        },
      ]),
    );

    await advanceProgression("team-1", "h1", "ch-1");

    expect(progressionReplace).not.toHaveBeenCalled();
  });

  it("does nothing when challenge not found", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([]));

    await advanceProgression("team-1", "h1", "nonexistent");

    expect(progressionReplace).not.toHaveBeenCalled();
  });

  it("does nothing when no progression record", async () => {
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));
    progressionQuery.mockReturnValue(emptyFetchAll([]));

    await advanceProgression("team-1", "h1", "ch-1");

    expect(progressionReplace).not.toHaveBeenCalled();
  });
});
