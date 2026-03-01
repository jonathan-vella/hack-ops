"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardAPI } from "@hackops/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeBadge } from "@/components/grade-badge";
import { AwardBadge } from "@/components/award-badge";
import { ChevronDownIcon, ChevronRightIcon, RefreshCwIcon } from "lucide-react";

const REFRESH_INTERVAL_MS = 30_000;

interface LeaderboardTableProps {
  hackathonId: string;
  initialData: LeaderboardAPI.LeaderboardResponse;
}

export function LeaderboardTable({
  hackathonId,
  initialData,
}: LeaderboardTableProps) {
  const [data, setData] = useState(initialData);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/leaderboard/${hackathonId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setData(json.data);
        }
      }
    } finally {
      setIsRefreshing(false);
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    }
  }, [hackathonId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void refresh();
          return REFRESH_INTERVAL_MS / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [refresh]);

  function toggleExpand(teamId: string) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  function formatTimestamp(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Last updated: {formatTimestamp(data.updatedAt)}</span>
        <span className="flex items-center gap-2">
          <RefreshCwIcon
            className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refreshing in {countdown}s
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-10" />
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Awards</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.entries.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground py-8"
              >
                No scores recorded yet.
              </TableCell>
            </TableRow>
          )}
          {data.entries.map((entry) => {
            const isExpanded = expandedTeams.has(entry.teamId);

            return (
              <LeaderboardRow
                key={entry.teamId}
                entry={entry}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(entry.teamId)}
                formatTimestamp={formatTimestamp}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardAPI.LeaderboardEntry;
  isExpanded: boolean;
  onToggle: () => void;
  formatTimestamp: (iso: string | null) => string;
}

function LeaderboardRow({
  entry,
  isExpanded,
  onToggle,
  formatTimestamp,
}: LeaderboardRowProps) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <TableCell className="font-bold text-muted-foreground">
          {entry.rank}
        </TableCell>
        <TableCell>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="font-medium">{entry.teamName}</TableCell>
        <TableCell className="text-right font-mono">
          {entry.totalScore}
        </TableCell>
        <TableCell>
          <GradeBadge grade={entry.gradeBadge} />
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {entry.awardBadges.map((award) => (
              <AwardBadge key={award} label={award} />
            ))}
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-0">
            <div className="px-8 py-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Approved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.challengeBreakdown.map((cs) => (
                    <TableRow key={cs.challengeId}>
                      <TableCell>{cs.challengeTitle}</TableCell>
                      <TableCell className="text-right font-mono">
                        {cs.score}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {cs.maxScore}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {cs.maxScore > 0
                          ? Math.round((cs.score / cs.maxScore) * 100)
                          : 0}
                        %
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(cs.approvedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
