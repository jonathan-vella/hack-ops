export interface UnlockedChallenge {
  challengeId: string;
  unlockedAt: string;
}

export interface Progression {
  id: string;
  _type: "progression";
  teamId: string;
  hackathonId: string;
  currentChallenge: number;
  unlockedChallenges: UnlockedChallenge[];
}
