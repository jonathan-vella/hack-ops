export interface RubricCategory {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface RubricPointer {
  id: string;
  _type: "rubric-pointer";
  hackathonId: string;
  activeRubricId: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RubricVersion {
  id: string;
  _type: "rubric-version";
  hackathonId: string;
  version: number;
  categories: RubricCategory[];
  createdBy: string;
  createdAt: string;
}
