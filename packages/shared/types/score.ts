export interface CategoryScore {
  categoryId: string;
  score: number;
}

export interface Score {
  id: string;
  _type: "score";
  teamId: string;
  hackathonId: string;
  challengeId: string;
  submissionId: string;
  categoryScores: CategoryScore[];
  total: number;
  approvedBy: string;
  approvedAt: string;
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideReason: string | null;
}
