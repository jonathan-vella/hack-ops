export interface Hackathon {
  id: string;
  _type: "hackathon";
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  eventCode: string;
  teamSize: number;
  createdBy: string;
  createdAt: string;
  launchedAt: string | null;
  archivedAt: string | null;
}
