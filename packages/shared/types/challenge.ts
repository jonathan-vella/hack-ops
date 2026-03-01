export interface Challenge {
  id: string;
  _type: "challenge";
  hackathonId: string;
  order: number;
  title: string;
  description: string;
  maxScore: number;
  createdBy: string;
  createdAt: string;
}
