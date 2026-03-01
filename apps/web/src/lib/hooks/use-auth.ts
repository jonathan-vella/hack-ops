"use client";

import type { UserRole, EasyAuthPrincipal } from "@hackops/shared";
import { useFetch } from "./use-fetch";

interface MeResponse {
  principal: EasyAuthPrincipal;
  roles: Array<{ hackathonId: string; role: UserRole }>;
  highestRole: UserRole | null;
}

interface UseAuthResult {
  principal: EasyAuthPrincipal | null;
  roles: Array<{ hackathonId: string; role: UserRole }>;
  highestRole: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthResult {
  const { data, isLoading } = useFetch<MeResponse>("/api/me");

  return {
    principal: data?.principal ?? null,
    roles: data?.roles ?? [],
    highestRole: data?.highestRole ?? null,
    isLoading,
    isAuthenticated: !!data?.principal,
  };
}
