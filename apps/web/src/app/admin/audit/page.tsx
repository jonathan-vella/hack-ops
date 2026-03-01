"use client";

import { useState } from "react";
import type { AuditAPI, HackathonsAPI } from "@hackops/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HackathonPicker } from "@/components/hackathon-picker";
import { EmptyState } from "@/components/empty-state";
import { PaginationBar } from "@/components/pagination-bar";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useFetch } from "@/lib/hooks/use-fetch";

const ACTION_TYPES = [
  "all",
  "approve",
  "reject",
  "override",
  "create",
  "update",
  "delete",
] as const;

export default function AdminAuditPage() {
  const { data: hackathonData } = useFetch<{
    items: HackathonsAPI.HackathonSummary[];
  }>("/api/hackathons");
  const hackathons = hackathonData?.items ?? [];
  const [selectedHackathon, setSelectedHackathon] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tokens, setTokens] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);

  const currentToken = tokens[page];
  const params = new URLSearchParams();
  if (actionFilter !== "all") params.set("action", actionFilter);
  if (currentToken) params.set("continuationToken", currentToken);

  const auditUrl = selectedHackathon
    ? `/api/audit/${selectedHackathon}?${params}`
    : null;
  const { data, isLoading } = useFetch<{
    items: AuditAPI.AuditEntry[];
    continuationToken?: string | null;
  }>(auditUrl);

  const entries = data?.items ?? [];
  const nextToken = data?.continuationToken;

  function goNext() {
    if (nextToken) {
      setTokens((prev) => {
        const next = [...prev];
        next[page + 1] = nextToken;
        return next;
      });
      setPage((p) => p + 1);
    }
  }

  function goPrevious() {
    if (page > 0) setPage((p) => p - 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Trail</h1>

      <div className="flex items-center gap-4">
        <HackathonPicker
          hackathons={hackathons}
          value={selectedHackathon}
          onValueChange={(v) => {
            setSelectedHackathon(v);
            setTokens([undefined]);
            setPage(0);
          }}
          className="w-64"
        />
        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setTokens([undefined]);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All actions" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedHackathon && (
        <EmptyState
          title="Select a hackathon"
          description="Choose a hackathon to view its audit trail"
        />
      )}

      {selectedHackathon && isLoading && <TableSkeleton />}

      {selectedHackathon && !isLoading && entries.length === 0 && (
        <EmptyState
          title="No audit entries"
          description="No actions have been recorded for this hackathon yet"
        />
      )}

      {entries.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">
                    {new Date(entry.performedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">{entry.action}</TableCell>
                  <TableCell className="text-xs">
                    {entry.targetType}:{entry.targetId.slice(0, 8)}
                  </TableCell>
                  <TableCell>{entry.performedBy}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {entry.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar
            hasNext={!!nextToken}
            hasPrevious={page > 0}
            onNext={goNext}
            onPrevious={goPrevious}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
