export interface Hacker {
  id: string;
  _type: "hacker";
  hackathonId: string;
  githubUserId: string;
  githubLogin: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  eventCode: string;
  teamId: string | null;
  joinedAt: string;
}
