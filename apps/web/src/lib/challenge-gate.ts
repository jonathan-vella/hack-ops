import { getContainer } from "./cosmos";

interface GateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks whether a team can submit for a given challenge.
 * Returns { allowed: false, reason } if the challenge is locked.
 *
 * Gate rule: the challenge's `order` must be <= the team's `currentChallenge`.
 */
export async function checkChallengeGate(
  teamId: string,
  hackathonId: string,
  challengeId: string,
): Promise<GateResult> {
  const challengesContainer = getContainer("challenges");
  const { resources: challenges } = await challengesContainer.items
    .query({
      query:
        "SELECT c.order FROM c WHERE c._type = 'challenge' AND c.id = @cid AND c.hackathonId = @hid",
      parameters: [
        { name: "@cid", value: challengeId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (challenges.length === 0) {
    return { allowed: false, reason: "Challenge not found" };
  }

  const challengeOrder = challenges[0].order as number;

  const progressionContainer = getContainer("progression");
  const { resources: progressions } = await progressionContainer.items
    .query({
      query:
        "SELECT * FROM c WHERE c._type = 'progression' AND c.teamId = @tid AND c.hackathonId = @hid",
      parameters: [
        { name: "@tid", value: teamId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (progressions.length === 0) {
    return { allowed: false, reason: "No progression record found for this team" };
  }

  const progression = progressions[0];
  if (challengeOrder > (progression.currentChallenge as number)) {
    return {
      allowed: false,
      reason: `Challenge is locked. Current unlocked challenge: ${progression.currentChallenge}`,
    };
  }

  return { allowed: true };
}

/**
 * After a submission is approved, advance the team's progression
 * if the approved challenge matches their current challenge.
 * Uses ETag-based conditional write to prevent race conditions.
 */
export async function advanceProgression(
  teamId: string,
  hackathonId: string,
  challengeId: string,
): Promise<void> {
  const challengesContainer = getContainer("challenges");
  const { resources: challenges } = await challengesContainer.items
    .query({
      query:
        "SELECT c.order FROM c WHERE c._type = 'challenge' AND c.id = @cid AND c.hackathonId = @hid",
      parameters: [
        { name: "@cid", value: challengeId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (challenges.length === 0) return;

  const challengeOrder = challenges[0].order as number;

  const progressionContainer = getContainer("progression");
  const { resources: progressions } = await progressionContainer.items
    .query({
      query:
        "SELECT * FROM c WHERE c._type = 'progression' AND c.teamId = @tid AND c.hackathonId = @hid",
      parameters: [
        { name: "@tid", value: teamId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (progressions.length === 0) return;

  const progression = progressions[0];

  // Only advance if the approved challenge matches currentChallenge
  if (challengeOrder !== (progression.currentChallenge as number)) return;

  const now = new Date().toISOString();
  const updated = {
    ...progression,
    currentChallenge: (progression.currentChallenge as number) + 1,
    unlockedChallenges: [
      ...(progression.unlockedChallenges as Array<{ challengeId: string; unlockedAt: string }>),
      { challengeId, unlockedAt: now },
    ],
  };

  // Conditional write with ETag to prevent race conditions
  await progressionContainer
    .item(progression.id as string, teamId)
    .replace(updated, { accessCondition: { type: "IfMatch", condition: progression._etag as string } });
}
