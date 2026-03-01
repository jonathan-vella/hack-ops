/**
 * HackOps API Contract
 *
 * Source of truth for all API request/response shapes.
 * Import from this file in route handlers and frontend components.
 * Do NOT duplicate these types elsewhere — let the compiler enforce the contract.
 *
 * Generated from: .github/prompts/plan-hackOps.prompt.md
 */

// ─── Shared Types ────────────────────────────────────────────

export type ApiResponse<T> =
  | { data: T; ok: true }
  | { error: string; ok: false };

export type UserRole = "admin" | "coach" | "hacker";

export type HackathonStatus = "draft" | "active" | "archived";

export type SubmissionState = "pending" | "approved" | "rejected";

export type GradeBadge = "A" | "B" | "C" | "D";

export interface PageRequest {
  continuationToken?: string;
  pageSize?: number;
}

export interface PageResponse<T> {
  items: T[];
  continuationToken?: string | null;
}

// ─── Easy Auth ───────────────────────────────────────────────

/** Decoded from the base64 `X-MS-CLIENT-PRINCIPAL` header set by App Service Easy Auth. */
export interface EasyAuthPrincipal {
  userId: string;
  githubLogin: string;
  email: string;
  avatarUrl: string;
}

// ─── Domain Building Blocks ──────────────────────────────────

/** A single rubric category (e.g. "Code Quality", "Creativity"). */
export interface RubricCategory {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

/** Coach-entered score for one rubric category. */
export interface CategoryScore {
  categoryId: string;
  score: number;
}

// ─── Health API ──────────────────────────────────────────────

export namespace HealthAPI {
  /** Individual dependency check result. */
  export interface DependencyCheck {
    name: string;
    status: "ok" | "degraded" | "unhealthy";
    responseTimeMs?: number;
    error?: string;
  }

  /** Health check response used by App Service Health Check feature. */
  export interface HealthCheckResponse {
    status: "ok" | "degraded" | "unhealthy";
    timestamp: string;
    checks?: DependencyCheck[];
  }

  export const PATHS = {
    base: "/api/health",
  } as const;
}

// ─── Hackathons API ──────────────────────────────────────────

export namespace HackathonsAPI {
  export interface CreateRequest {
    name: string;
    description?: string;
    teamSize?: number;
  }

  export interface UpdateRequest {
    name?: string;
    description?: string;
    status?: HackathonStatus;
    teamSize?: number;
  }

  export interface HackathonRecord {
    id: string;
    name: string;
    description: string;
    status: HackathonStatus;
    eventCode: string;
    teamSize: number;
    createdBy: string;
    createdAt: string;
    launchedAt: string | null;
    archivedAt: string | null;
  }

  export interface HackathonSummary {
    id: string;
    name: string;
    status: HackathonStatus;
    eventCode: string;
    teamCount: number;
    hackerCount: number;
  }

  export interface ListRequest extends PageRequest {
    status?: HackathonStatus;
  }

  export interface AssignTeamsRequest {
    teamSize?: number;
  }

  export interface AssignTeamsResponse {
    teamsCreated: number;
    hackersAssigned: number;
  }

  export const PATHS = {
    base: "/api/hackathons",
    byId: (id: string) => `/api/hackathons/${id}` as const,
    assignTeams: (id: string) => `/api/hackathons/${id}/assign-teams` as const,
  } as const;
}

// ─── Join API (Hacker Onboarding) ────────────────────────────

export namespace JoinAPI {
  export interface JoinRequest {
    eventCode: string;
  }

  export interface JoinResponse {
    hackerId: string;
    hackathonId: string;
    hackathonName: string;
  }

  export const PATHS = {
    base: "/api/join",
  } as const;
}

// ─── Teams API ───────────────────────────────────────────────

export namespace TeamsAPI {
  export interface TeamMember {
    hackerId: string;
    githubLogin: string;
    displayName: string;
  }

  export interface TeamRecord {
    id: string;
    hackathonId: string;
    name: string;
    members: TeamMember[];
  }

  export interface ListRequest extends PageRequest {
    hackathonId: string;
  }

  export interface ReassignRequest {
    hackerId: string;
    targetTeamId: string;
  }

  export const PATHS = {
    base: "/api/teams",
    reassign: (id: string) => `/api/teams/${id}/reassign` as const,
  } as const;
}

// ─── Rubrics API ─────────────────────────────────────────────

export namespace RubricsAPI {
  export interface CreateRequest {
    categories: RubricCategory[];
  }

  export interface UpdateRequest {
    categories?: RubricCategory[];
    isActive?: boolean;
  }

  export interface RubricRecord {
    id: string;
    version: number;
    categories: RubricCategory[];
    isActive: boolean;
    createdBy: string;
    createdAt: string;
  }

  export interface RubricSummary {
    id: string;
    version: number;
    isActive: boolean;
    categoryCount: number;
    createdAt: string;
  }

  export interface ListRequest extends PageRequest {
    activeOnly?: boolean;
  }

  export const PATHS = {
    base: "/api/rubrics",
    byId: (id: string) => `/api/rubrics/${id}` as const,
  } as const;
}

// ─── Submissions API ─────────────────────────────────────────

export namespace SubmissionsAPI {
  /** Hacker submits evidence (description + optional attachments). */
  export interface CreateRequest {
    challengeId: string;
    description: string;
    attachments?: string[];
  }

  /** Coach approves (with rubric scores) or rejects a submission. */
  export interface ReviewRequest {
    status: "approved" | "rejected";
    reason: string;
    scores?: CategoryScore[];
  }

  export interface SubmissionRecord {
    id: string;
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

  export interface ListRequest extends PageRequest {
    hackathonId: string;
    status?: SubmissionState;
    teamId?: string;
  }

  export const PATHS = {
    base: "/api/submissions",
    byId: (id: string) => `/api/submissions/${id}` as const,
  } as const;
}

// ─── Scores API ──────────────────────────────────────────────

export namespace ScoresAPI {
  /** Immutable score record created when a submission is approved. */
  export interface ScoreRecord {
    id: string;
    teamId: string;
    hackathonId: string;
    challengeId: string;
    submissionId: string;
    categoryScores: CategoryScore[];
    total: number;
    approvedBy: string;
    approvedAt: string;
  }

  export interface OverrideRequest {
    categoryScores: CategoryScore[];
    reason: string;
  }

  export const PATHS = {
    override: (id: string) => `/api/scores/${id}/override` as const,
  } as const;
}

// ─── Leaderboard API ─────────────────────────────────────────

export namespace LeaderboardAPI {
  export interface ChallengeScore {
    challengeId: string;
    challengeTitle: string;
    score: number;
    maxScore: number;
    approvedAt: string | null;
  }

  export interface LeaderboardEntry {
    teamId: string;
    teamName: string;
    totalScore: number;
    rank: number;
    gradeBadge: GradeBadge;
    awardBadges: string[];
    challengeBreakdown: ChallengeScore[];
    /** Used for tiebreaker — earliest last-approval timestamp wins. */
    lastApprovalAt: string | null;
  }

  export interface LeaderboardResponse {
    hackathonId: string;
    hackathonName: string;
    entries: LeaderboardEntry[];
    updatedAt: string;
  }

  export const PATHS = {
    byHackathon: (hackathonId: string) =>
      `/api/leaderboard/${hackathonId}` as const,
  } as const;
}

// ─── Challenges API ──────────────────────────────────────────

export namespace ChallengesAPI {
  export interface CreateRequest {
    hackathonId: string;
    order: number;
    title: string;
    description: string;
    maxScore: number;
  }

  export interface ChallengeRecord {
    id: string;
    hackathonId: string;
    order: number;
    title: string;
    description: string;
    maxScore: number;
    createdBy: string;
    createdAt: string;
  }

  export interface ListRequest extends PageRequest {
    hackathonId: string;
  }

  export const PATHS = {
    base: "/api/challenges",
    byId: (id: string) => `/api/challenges/${id}` as const,
  } as const;
}

// ─── Progression API ─────────────────────────────────────────

export namespace ProgressionAPI {
  export interface UnlockedChallenge {
    challengeId: string;
    unlockedAt: string;
  }

  export interface ProgressionRecord {
    id: string;
    teamId: string;
    hackathonId: string;
    currentChallenge: number;
    unlockedChallenges: UnlockedChallenge[];
  }

  export interface GetRequest {
    hackathonId: string;
    teamId: string;
  }

  export const PATHS = {
    base: "/api/progression",
  } as const;
}

// ─── Roles API ───────────────────────────────────────────────

export namespace RolesAPI {
  export interface InviteRequest {
    hackathonId: string;
    githubLogin: string;
    role: "admin" | "coach";
  }

  export interface RoleRecord {
    id: string;
    hackathonId: string;
    githubUserId: string;
    githubLogin: string;
    role: UserRole;
    isPrimaryAdmin: boolean;
    assignedBy: string;
    assignedAt: string;
  }

  export interface ListRequest extends PageRequest {
    hackathonId: string;
  }

  export const PATHS = {
    base: "/api/roles",
    invite: "/api/roles/invite",
    byId: (id: string) => `/api/roles/${id}` as const,
  } as const;
}

// ─── Audit API ───────────────────────────────────────────────

export namespace AuditAPI {
  export interface AuditEntry {
    id: string;
    hackathonId: string;
    action: string;
    targetType: string;
    targetId: string;
    performedBy: string;
    performedAt: string;
    reason: string | null;
    details: Record<string, unknown> | null;
  }

  export interface ListRequest extends PageRequest {
    hackathonId: string;
    action?: string;
  }

  export const PATHS = {
    byHackathon: (hackathonId: string) => `/api/audit/${hackathonId}` as const,
  } as const;
}

// ─── Config API ──────────────────────────────────────────────

export namespace ConfigAPI {
  export interface ConfigRecord {
    id: string;
    key: string;
    value: string | number | boolean;
    updatedBy: string;
    updatedAt: string;
  }

  export interface UpdateRequest {
    value: string | number | boolean;
  }

  export const PATHS = {
    base: "/api/config",
    byKey: (key: string) => `/api/config/${key}` as const,
  } as const;
}
