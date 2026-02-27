import { getContainer } from "./cosmos";
import type { LeaderboardAPI, GradeBadge } from "@hackops/shared";

interface ScoreDoc {
  id: string;
  teamId: string;
  hackathonId: string;
  challengeId: string;
  total: number;
  approvedAt: string;
}

interface TeamDoc {
  id: string;
  hackathonId: string;
  name: string;
}

interface ChallengeDoc {
  id: string;
  hackathonId: string;
  title: string;
  maxScore: number;
  order: number;
}

interface HackathonDoc {
  id: string;
  name: string;
  status: string;
}

function computeGradeBadge(percentage: number): GradeBadge {
  if (percentage >= 90) return "A";
  if (percentage >= 75) return "B";
  if (percentage >= 60) return "C";
  return "D";
}

interface TeamAggregation {
  totalScore: number;
  lastApprovalAt: string | null;
  challengeScores: Map<string, { score: number; approvedAt: string }>;
}

/**
 * Aggregate approved scores, compute ranks, grade badges, and award badges.
 * Used by both the API route (for client polling) and the SSR page (for initial render).
 */
export async function buildLeaderboard(
  hackathonId: string,
): Promise<LeaderboardAPI.LeaderboardResponse | null> {
  const hackathonContainer = getContainer("hackathons");
  const { resource: hackathon } = await hackathonContainer
    .item(hackathonId, hackathonId)
    .read<HackathonDoc>();

  if (!hackathon) return null;

  // Parallel queries — scores is cross-partition, teams + challenges single-partition
  const [scoresResult, teamsResult, challengesResult] = await Promise.all([
    getContainer("scores")
      .items.query<ScoreDoc>({
        query:
          "SELECT c.id, c.teamId, c.challengeId, c.total, c.approvedAt FROM c WHERE c.hackathonId = @hid AND c._type = 'score'",
        parameters: [{ name: "@hid", value: hackathonId }],
      })
      .fetchAll(),
    getContainer("teams")
      .items.query<TeamDoc>({
        query:
          "SELECT c.id, c.name, c.hackathonId FROM c WHERE c.hackathonId = @hid AND c._type = 'team'",
        parameters: [{ name: "@hid", value: hackathonId }],
      })
      .fetchAll(),
    getContainer("challenges")
      .items.query<ChallengeDoc>({
        query:
          "SELECT c.id, c.title, c.maxScore, c.order FROM c WHERE c.hackathonId = @hid AND c._type = 'challenge' ORDER BY c.order ASC",
        parameters: [{ name: "@hid", value: hackathonId }],
      })
      .fetchAll(),
  ]);

  const scores = scoresResult.resources;
  const teams = teamsResult.resources;
  const challenges = challengesResult.resources;

  const maxPossible = challenges.reduce((sum, ch) => sum + ch.maxScore, 0);
  const challengeMap = new Map(challenges.map((c) => [c.id, c]));

  // Aggregate scores by team
  const teamAggMap = new Map<string, TeamAggregation>();
  for (const team of teams) {
    teamAggMap.set(team.id, {
      totalScore: 0,
      lastApprovalAt: null,
      challengeScores: new Map(),
    });
  }

  for (const score of scores) {
    let agg = teamAggMap.get(score.teamId);
    if (!agg) {
      agg = { totalScore: 0, lastApprovalAt: null, challengeScores: new Map() };
      teamAggMap.set(score.teamId, agg);
    }

    agg.totalScore += score.total;

    if (!agg.lastApprovalAt || score.approvedAt > agg.lastApprovalAt) {
      agg.lastApprovalAt = score.approvedAt;
    }

    agg.challengeScores.set(score.challengeId, {
      score: score.total,
      approvedAt: score.approvedAt,
    });
  }

  // Award badges computation
  const totalChallenges = challenges.length;

  // "Fastest to Complete" — first team with ALL challenges approved
  let fastestTeamId: string | null = null;
  let fastestTimestamp: string | null = null;

  for (const [teamId, agg] of teamAggMap) {
    if (agg.challengeScores.size === totalChallenges && totalChallenges > 0) {
      if (
        !fastestTimestamp ||
        (agg.lastApprovalAt && agg.lastApprovalAt < fastestTimestamp)
      ) {
        fastestTeamId = teamId;
        fastestTimestamp = agg.lastApprovalAt;
      }
    }
  }

  // "Highest Score per Challenge" — solo top scorer per challenge
  const highestPerChallenge = new Map<string, string[]>();
  for (const challenge of challenges) {
    let maxScore = 0;
    let topTeams: string[] = [];

    for (const [teamId, agg] of teamAggMap) {
      const cs = agg.challengeScores.get(challenge.id);
      if (cs) {
        if (cs.score > maxScore) {
          maxScore = cs.score;
          topTeams = [teamId];
        } else if (cs.score === maxScore && maxScore > 0) {
          topTeams.push(teamId);
        }
      }
    }

    // Only award when there's a single undisputed leader
    if (topTeams.length === 1) {
      highestPerChallenge.set(challenge.id, topTeams);
    }
  }

  // "Perfect Score" — 100% on any challenge
  const perfectScoreTeams = new Set<string>();
  for (const [teamId, agg] of teamAggMap) {
    for (const [challengeId, cs] of agg.challengeScores) {
      const ch = challengeMap.get(challengeId);
      if (ch && cs.score >= ch.maxScore) {
        perfectScoreTeams.add(teamId);
      }
    }
  }

  // Build unsorted entries
  const unsorted = teams.map((team) => {
    const agg = teamAggMap.get(team.id) ?? {
      totalScore: 0,
      lastApprovalAt: null,
      challengeScores: new Map(),
    };

    const percentage =
      maxPossible > 0 ? (agg.totalScore / maxPossible) * 100 : 0;

    const awardBadges: string[] = [];
    if (fastestTeamId === team.id) awardBadges.push("Fastest to Complete");
    for (const [challengeId, teamIds] of highestPerChallenge) {
      if (teamIds.includes(team.id)) {
        const ch = challengeMap.get(challengeId);
        awardBadges.push(`Highest ${ch?.title ?? "Score"}`);
      }
    }
    if (perfectScoreTeams.has(team.id)) awardBadges.push("Perfect Score");

    const challengeBreakdown: LeaderboardAPI.ChallengeScore[] = challenges.map(
      (ch) => {
        const cs = agg.challengeScores.get(ch.id);
        return {
          challengeId: ch.id,
          challengeTitle: ch.title,
          score: cs?.score ?? 0,
          maxScore: ch.maxScore,
          approvedAt: cs?.approvedAt ?? null,
        };
      },
    );

    return {
      teamId: team.id,
      teamName: team.name,
      totalScore: agg.totalScore,
      lastApprovalAt: agg.lastApprovalAt,
      gradeBadge: computeGradeBadge(percentage),
      awardBadges,
      challengeBreakdown,
    };
  });

  // Sort: total score DESC, tiebreaker: earliest lastApprovalAt ASC
  unsorted.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (!a.lastApprovalAt && !b.lastApprovalAt) return 0;
    if (!a.lastApprovalAt) return 1;
    if (!b.lastApprovalAt) return -1;
    return a.lastApprovalAt.localeCompare(b.lastApprovalAt);
  });

  const entries: LeaderboardAPI.LeaderboardEntry[] = unsorted.map((e, i) => ({
    ...e,
    rank: i + 1,
  }));

  return {
    hackathonId,
    hackathonName: hackathon.name,
    entries,
    updatedAt: new Date().toISOString(),
  };
}
