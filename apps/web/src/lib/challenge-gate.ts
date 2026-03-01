import { query, queryOne, execute } from "./sql";

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
  const challenge = await queryOne<{ order: number }>(
    "SELECT [order] FROM challenges WHERE id = @cid AND hackathonId = @hid",
    { cid: challengeId, hid: hackathonId },
  );

  if (!challenge) {
    return { allowed: false, reason: "Challenge not found" };
  }

  const challengeOrder = challenge.order;

  const progression = await queryOne<{
    currentChallenge: number;
    rowVersion: Buffer;
  }>(
    "SELECT currentChallenge, rowVersion FROM progressions WHERE teamId = @tid AND hackathonId = @hid",
    { tid: teamId, hid: hackathonId },
  );

  if (!progression) {
    return {
      allowed: false,
      reason: "No progression record found for this team",
    };
  }

  if (challengeOrder > progression.currentChallenge) {
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
 * Uses rowVersion-based optimistic concurrency to prevent race conditions.
 */
export async function advanceProgression(
  teamId: string,
  hackathonId: string,
  challengeId: string,
): Promise<void> {
  const challenge = await queryOne<{ order: number }>(
    "SELECT [order] FROM challenges WHERE id = @cid AND hackathonId = @hid",
    { cid: challengeId, hid: hackathonId },
  );

  if (!challenge) return;

  const challengeOrder = challenge.order;

  const progression = await queryOne<{
    id: string;
    currentChallenge: number;
    unlockedChallenges: string;
    rowVersion: Buffer;
  }>(
    "SELECT id, currentChallenge, unlockedChallenges, rowVersion FROM progressions WHERE teamId = @tid AND hackathonId = @hid",
    { tid: teamId, hid: hackathonId },
  );

  if (!progression) return;

  if (challengeOrder !== progression.currentChallenge) return;

  const now = new Date().toISOString();
  const unlocked = JSON.parse(progression.unlockedChallenges) as Array<{
    challengeId: string;
    unlockedAt: string;
  }>;
  unlocked.push({ challengeId, unlockedAt: now });

  // Optimistic concurrency via rowVersion — UPDATE fails (0 rows) if another writer changed the row
  const rowsAffected = await execute(
    `UPDATE progressions
     SET currentChallenge = @nextChallenge, unlockedChallenges = @unlocked
     WHERE id = @id AND rowVersion = @rowVersion`,
    {
      nextChallenge: progression.currentChallenge + 1,
      unlocked: JSON.stringify(unlocked),
      id: progression.id,
      rowVersion: progression.rowVersion,
    },
  );

  if (rowsAffected === 0) {
    throw new Error("Concurrent modification detected on progression record");
  }
}
