export type UserRole = "admin" | "coach" | "hacker";

export interface Role {
  id: string;
  _type: "role";
  hackathonId: string;
  githubUserId: string;
  githubLogin: string;
  role: UserRole;
  isPrimaryAdmin: boolean;
  assignedBy: string;
  assignedAt: string;
}
