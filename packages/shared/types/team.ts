export interface TeamMember {
  hackerId: string;
  githubLogin: string;
  displayName: string;
}

export interface Team {
  id: string;
  _type: "team";
  hackathonId: string;
  name: string;
  members: TeamMember[];
}
