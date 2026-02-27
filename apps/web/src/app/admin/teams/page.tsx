"use client";

import { useState } from "react";
import type { HackathonsAPI, TeamsAPI } from "@hackops/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HackathonPicker } from "@/components/hackathon-picker";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CardSkeleton } from "@/components/loading-skeleton";
import { useFetch } from "@/lib/hooks/use-fetch";
import { ArrowRightIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminTeamsPage() {
  const { data: hackathons } =
    useFetch<HackathonsAPI.HackathonSummary[]>("/api/hackathons");
  const [selectedHackathon, setSelectedHackathon] = useState("");

  const teamsUrl = selectedHackathon
    ? `/api/teams?hackathonId=${selectedHackathon}`
    : null;
  const { data: teamsData, isLoading: teamsLoading, refetch } =
    useFetch<{ items: TeamsAPI.TeamRecord[] }>(teamsUrl);

  const teams = teamsData?.items ?? [];

  const [reassign, setReassign] = useState<{
    hackerId: string;
    hackerName: string;
    fromTeamId: string;
    targetTeamId: string;
  } | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

  async function handleReassign() {
    if (!reassign) return;
    setIsReassigning(true);

    try {
      await fetch(`/api/teams/${reassign.fromTeamId}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackerId: reassign.hackerId,
          targetTeamId: reassign.targetTeamId,
        }),
      });
      setReassign(null);
      await refetch();
    } finally {
      setIsReassigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <HackathonPicker
          hackathons={hackathons ?? []}
          value={selectedHackathon}
          onValueChange={setSelectedHackathon}
          className="w-64"
        />
      </div>

      {!selectedHackathon && (
        <EmptyState
          title="Select a hackathon"
          description="Choose a hackathon to view and manage its teams"
        />
      )}

      {selectedHackathon && teamsLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {selectedHackathon && !teamsLoading && teams.length === 0 && (
        <EmptyState
          title="No teams yet"
          description="Teams are created when you assign hackers from the Hackathons page"
        />
      )}

      {teams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="text-base">{team.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {team.members.map((member) => (
                  <div
                    key={member.hackerId}
                    className="flex items-center justify-between"
                  >
                    <Badge variant="secondary">{member.githubLogin}</Badge>
                    <div className="flex items-center gap-2">
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                      <Select
                        onValueChange={(targetTeamId) =>
                          setReassign({
                            hackerId: member.hackerId,
                            hackerName: member.githubLogin,
                            fromTeamId: team.id,
                            targetTeamId,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue placeholder="Move to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teams
                            .filter((t) => t.id !== team.id)
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!reassign}
        onOpenChange={(open) => !open && setReassign(null)}
        title="Reassign hacker?"
        description={
          reassign
            ? `Move ${reassign.hackerName} to a different team?`
            : ""
        }
        confirmLabel="Reassign"
        onConfirm={handleReassign}
        isLoading={isReassigning}
      />
    </div>
  );
}
