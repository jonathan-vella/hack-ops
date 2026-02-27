import type { UserRole } from "@hackops/shared";
import { getContainer } from "./cosmos";

interface RoleDocument {
  id: string;
  hackathonId: string;
  githubUserId: string;
  role: UserRole;
  isPrimaryAdmin: boolean;
}

export async function resolveRole(
  githubUserId: string,
  hackathonId: string,
): Promise<UserRole | null> {
  const container = getContainer("roles");
  const { resources } = await container.items
    .query<RoleDocument>({
      query:
        "SELECT * FROM c WHERE c.githubUserId = @userId AND c.hackathonId = @hid",
      parameters: [
        { name: "@userId", value: githubUserId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  if (resources.length === 0) return null;
  return resources[0].role;
}

export async function isPrimaryAdmin(
  githubUserId: string,
  hackathonId: string,
): Promise<boolean> {
  const container = getContainer("roles");
  const { resources } = await container.items
    .query<RoleDocument>({
      query:
        "SELECT * FROM c WHERE c.githubUserId = @userId AND c.hackathonId = @hid AND c.isPrimaryAdmin = true",
      parameters: [
        { name: "@userId", value: githubUserId },
        { name: "@hid", value: hackathonId },
      ],
    })
    .fetchAll();

  return resources.length > 0;
}

export function getDevRole(): UserRole | null {
  if (process.env.NODE_ENV !== "development") return null;
  const role = process.env.DEV_USER_ROLE;
  if (role === "admin" || role === "coach" || role === "hacker") return role;
  return null;
}
