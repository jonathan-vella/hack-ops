"use client";

import type { ChallengesAPI, SubmissionState } from "@hackops/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { LockIcon, UnlockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeCardProps {
  challenge: ChallengesAPI.ChallengeRecord;
  isUnlocked: boolean;
  isCurrent: boolean;
  submissionState?: SubmissionState | null;
  onSubmit?: () => void;
}

export function ChallengeCard({
  challenge,
  isUnlocked,
  isCurrent,
  submissionState,
}: ChallengeCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors",
        isCurrent && "border-primary",
        !isUnlocked && "opacity-60",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        {isUnlocked ? (
          <UnlockIcon className="h-4 w-4 text-green-600" />
        ) : (
          <LockIcon className="h-4 w-4 text-muted-foreground" />
        )}
        <CardTitle className="text-base">
          Challenge {challenge.order}: {challenge.title}
        </CardTitle>
        <div className="ml-auto flex gap-2">
          {isCurrent && (
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          )}
          {submissionState && <StatusBadge status={submissionState} />}
        </div>
      </CardHeader>
      {isUnlocked && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {challenge.description}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Max score: {challenge.maxScore}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
