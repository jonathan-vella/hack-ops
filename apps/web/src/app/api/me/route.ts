import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole, EasyAuthPrincipal } from "@hackops/shared";
import { getAuthPrincipal } from "@/lib/auth";
import { getContainer } from "@/lib/cosmos";

interface RoleDoc {
  hackathonId: string;
  role: UserRole;
}

export async function GET(request: NextRequest) {
  const principal = getAuthPrincipal(request.headers);
  if (!principal) {
    return NextResponse.json(
      { error: "Authentication required", ok: false },
      { status: 401 },
    );
  }

  const devRole =
    process.env.NODE_ENV === "development" ? process.env.DEV_USER_ROLE : null;

  let roles: Array<{ hackathonId: string; role: UserRole }> = [];

  if (devRole === "admin" || devRole === "coach" || devRole === "hacker") {
    roles = [{ hackathonId: "dev", role: devRole }];
  } else {
    try {
      const container = getContainer("roles");
      const { resources } = await container.items
        .query<RoleDoc>({
          query: "SELECT c.hackathonId, c.role FROM c WHERE c.githubUserId = @uid",
          parameters: [{ name: "@uid", value: principal.userId }],
        })
        .fetchAll();
      roles = resources;
    } catch {
      roles = [];
    }
  }

  const highestRole = deriveHighestRole(roles.map((r) => r.role));

  const data: MeResponse = {
    principal,
    roles,
    highestRole,
  };

  return NextResponse.json({ data, ok: true });
}

function deriveHighestRole(roleList: UserRole[]): UserRole | null {
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("coach")) return "coach";
  if (roleList.includes("hacker")) return "hacker";
  return null;
}

export interface MeResponse {
  principal: EasyAuthPrincipal;
  roles: Array<{ hackathonId: string; role: UserRole }>;
  highestRole: UserRole | null;
}
