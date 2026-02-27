import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
const mockRead = vi.fn();
const mockItem = vi.fn(() => ({ read: mockRead }));

vi.mock("../cosmos", () => ({
  getContainer: vi.fn((name: string) => {
    return {
      items: { query: mockQuery },
      item: mockItem,
    };
  }),
}));

import { buildLeaderboard } from "../leaderboard";

function emptyFetchAll(resources: unknown[] = []) {
  return { fetchAll: vi.fn().mockResolvedValue({ resources }) };
}

const sampleChallenges = [
  { id: "ch-1", hackathonId: "h1", title: "Challenge 1", maxScore: 50, order: 1 },
  { id: "ch-2", hackathonId: "h1", title: "Challenge 2", maxScore: 50, order: 2 },
];

const sampleTeams = [
  { id: "team-a", hackathonId: "h1", name: "Alpha" },
  { id: "team-b", hackathonId: "h1", name: "Beta" },
];

describe("buildLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when hackathon not found", async () => {
    mockRead.mockResolvedValue({ resource: undefined });

    const result = await buildLeaderboard("nonexistent");

    expect(result).toBeNull();
  });

  it("returns empty leaderboard when no teams exist", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });
    // scores, teams, challenges — all empty
    mockQuery
      .mockReturnValueOnce(emptyFetchAll([]))
      .mockReturnValueOnce(emptyFetchAll([]))
      .mockReturnValueOnce(emptyFetchAll([]));

    const result = await buildLeaderboard("h1");

    expect(result).not.toBeNull();
    expect(result!.hackathonId).toBe("h1");
    expect(result!.hackathonName).toBe("Test Hack");
    expect(result!.entries).toHaveLength(0);
    expect(result!.updatedAt).toBeTruthy();
  });

  it("ranks teams by total score descending", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-b", challengeId: "ch-1", total: 45, approvedAt: "2025-01-01T11:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    expect(result!.entries).toHaveLength(2);
    expect(result!.entries[0].teamName).toBe("Beta");
    expect(result!.entries[0].totalScore).toBe(45);
    expect(result!.entries[0].rank).toBe(1);
    expect(result!.entries[1].teamName).toBe("Alpha");
    expect(result!.entries[1].totalScore).toBe(30);
    expect(result!.entries[1].rank).toBe(2);
  });

  it("uses earliest lastApprovalAt as tiebreaker", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T12:00:00Z" },
      { id: "s2", teamId: "team-b", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    // Beta has earlier approval, so ranked first in tiebreaker
    expect(result!.entries[0].teamName).toBe("Beta");
    expect(result!.entries[0].rank).toBe(1);
    expect(result!.entries[1].teamName).toBe("Alpha");
    expect(result!.entries[1].rank).toBe(2);
  });

  it("assigns grade badges based on percentage thresholds", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const teams = [
      { id: "t-a", hackathonId: "h1", name: "A-Team" },
      { id: "t-b", hackathonId: "h1", name: "B-Team" },
      { id: "t-c", hackathonId: "h1", name: "C-Team" },
      { id: "t-d", hackathonId: "h1", name: "D-Team" },
    ];

    const challenges = [
      { id: "ch-1", hackathonId: "h1", title: "Only", maxScore: 100, order: 1 },
    ];

    // A: 95% → A, B: 80% → B, C: 65% → C, D: 40% → D
    const scores = [
      { id: "s1", teamId: "t-a", challengeId: "ch-1", total: 95, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "t-b", challengeId: "ch-1", total: 80, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s3", teamId: "t-c", challengeId: "ch-1", total: 65, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s4", teamId: "t-d", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(teams))
      .mockReturnValueOnce(emptyFetchAll(challenges));

    const result = await buildLeaderboard("h1");

    const grades = result!.entries.map((e) => ({ name: e.teamName, grade: e.gradeBadge }));
    expect(grades).toContainEqual({ name: "A-Team", grade: "A" });
    expect(grades).toContainEqual({ name: "B-Team", grade: "B" });
    expect(grades).toContainEqual({ name: "C-Team", grade: "C" });
    expect(grades).toContainEqual({ name: "D-Team", grade: "D" });
  });

  it("awards 'Fastest to Complete' badge to first team completing all challenges", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      // Team A completes both, last approval at 12:00
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-a", challengeId: "ch-2", total: 40, approvedAt: "2025-01-01T12:00:00Z" },
      // Team B completes both, last approval at 11:00 (faster)
      { id: "s3", teamId: "team-b", challengeId: "ch-1", total: 25, approvedAt: "2025-01-01T09:00:00Z" },
      { id: "s4", teamId: "team-b", challengeId: "ch-2", total: 35, approvedAt: "2025-01-01T11:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    const teamB = result!.entries.find((e) => e.teamName === "Beta");
    expect(teamB!.awardBadges).toContain("Fastest to Complete");

    const teamA = result!.entries.find((e) => e.teamName === "Alpha");
    expect(teamA!.awardBadges).not.toContain("Fastest to Complete");
  });

  it("awards 'Perfect Score' badge for full marks on any challenge", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      // Team A gets perfect on ch-1 (maxScore=50)
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 50, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-b", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    const teamA = result!.entries.find((e) => e.teamName === "Alpha");
    expect(teamA!.awardBadges).toContain("Perfect Score");

    const teamB = result!.entries.find((e) => e.teamName === "Beta");
    expect(teamB!.awardBadges).not.toContain("Perfect Score");
  });

  it("awards 'Highest <Challenge>' badge only when undisputed leader", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      // ch-1: team-a=40, team-b=30 → team-a wins
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-b", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
      // ch-2: tied at 35 → no award
      { id: "s3", teamId: "team-a", challengeId: "ch-2", total: 35, approvedAt: "2025-01-01T11:00:00Z" },
      { id: "s4", teamId: "team-b", challengeId: "ch-2", total: 35, approvedAt: "2025-01-01T11:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    const teamA = result!.entries.find((e) => e.teamName === "Alpha");
    expect(teamA!.awardBadges).toContain("Highest Challenge 1");
    // ch-2 is tied, so no "Highest Challenge 2" badge
    expect(teamA!.awardBadges).not.toContain("Highest Challenge 2");
  });

  it("includes challenge breakdown for each team", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    const teamA = result!.entries.find((e) => e.teamName === "Alpha");
    expect(teamA!.challengeBreakdown).toHaveLength(2);
    expect(teamA!.challengeBreakdown[0]).toEqual({
      challengeId: "ch-1",
      challengeTitle: "Challenge 1",
      score: 40,
      maxScore: 50,
      approvedAt: "2025-01-01T10:00:00Z",
    });
    // ch-2 unanswered
    expect(teamA!.challengeBreakdown[1]).toEqual({
      challengeId: "ch-2",
      challengeTitle: "Challenge 2",
      score: 0,
      maxScore: 50,
      approvedAt: null,
    });
  });

  it("handles scores for teams not in the teams query (orphan scores)", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    // Score exists for team not in teams list
    const scores = [
      { id: "s1", teamId: "orphan-team", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-a", challengeId: "ch-1", total: 40, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll([sampleTeams[0]]))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    // Only the registered team should appear in entries
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].teamName).toBe("Alpha");
  });

  it("handles null lastApprovalAt in tiebreaker sorting", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    // Both teams have same total but team-a has no scores (null lastApprovalAt)
    const teams = [
      { id: "t-1", hackathonId: "h1", name: "NoScores" },
      { id: "t-2", hackathonId: "h1", name: "HasScores" },
      { id: "t-3", hackathonId: "h1", name: "AlsoNoScores" },
    ];

    const scores: unknown[] = [];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(teams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    // All at 0, all null timestamps — stable sort
    expect(result!.entries).toHaveLength(3);
    expect(result!.entries.every((e) => e.totalScore === 0)).toBe(true);
  });

  it("no 'Fastest to Complete' when no team completes all challenges", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    // Only ch-1 scores, not ch-2
    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 30, approvedAt: "2025-01-01T10:00:00Z" },
      { id: "s2", teamId: "team-b", challengeId: "ch-1", total: 25, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    // No team should have the badge
    for (const entry of result!.entries) {
      expect(entry.awardBadges).not.toContain("Fastest to Complete");
    }
  });

  it("grade D for zero scores (maxPossible > 0)", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    mockQuery
      .mockReturnValueOnce(emptyFetchAll([]))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll(sampleChallenges));

    const result = await buildLeaderboard("h1");

    expect(result!.entries[0].gradeBadge).toBe("D");
  });

  it("grade D when maxPossible is 0 (no challenges)", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    mockQuery
      .mockReturnValueOnce(emptyFetchAll([]))
      .mockReturnValueOnce(emptyFetchAll(sampleTeams))
      .mockReturnValueOnce(emptyFetchAll([])); // no challenges

    const result = await buildLeaderboard("h1");

    expect(result!.entries[0].gradeBadge).toBe("D");
  });

  it("grade A at exactly 90%", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const challenges = [
      { id: "ch-1", hackathonId: "h1", title: "C1", maxScore: 100, order: 1 },
    ];
    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 90, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll([sampleTeams[0]]))
      .mockReturnValueOnce(emptyFetchAll(challenges));

    const result = await buildLeaderboard("h1");

    expect(result!.entries[0].gradeBadge).toBe("A");
  });

  it("grade B at exactly 75%", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const challenges = [
      { id: "ch-1", hackathonId: "h1", title: "C1", maxScore: 100, order: 1 },
    ];
    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 75, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll([sampleTeams[0]]))
      .mockReturnValueOnce(emptyFetchAll(challenges));

    const result = await buildLeaderboard("h1");

    expect(result!.entries[0].gradeBadge).toBe("B");
  });

  it("grade C at exactly 60%", async () => {
    mockRead.mockResolvedValue({
      resource: { id: "h1", name: "Test Hack", status: "active" },
    });

    const challenges = [
      { id: "ch-1", hackathonId: "h1", title: "C1", maxScore: 100, order: 1 },
    ];
    const scores = [
      { id: "s1", teamId: "team-a", challengeId: "ch-1", total: 60, approvedAt: "2025-01-01T10:00:00Z" },
    ];

    mockQuery
      .mockReturnValueOnce(emptyFetchAll(scores))
      .mockReturnValueOnce(emptyFetchAll([sampleTeams[0]]))
      .mockReturnValueOnce(emptyFetchAll(challenges));

    const result = await buildLeaderboard("h1");

    expect(result!.entries[0].gradeBadge).toBe("C");
  });
});
