import type { CategoryScore } from "./score";

export type SubmissionState = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  _type: "submission";
  teamId: string;
  hackathonId: string;
  challengeId: string;
  state: SubmissionState;
  description: string;
  attachments: string[];
  submittedBy: string;
  submittedAt: string;
  scores: CategoryScore[] | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}
