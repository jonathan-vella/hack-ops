"use client";

import { useState } from "react";
import type { HackathonsAPI, HackathonStatus } from "@hackops/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useFetch } from "@/lib/hooks/use-fetch";
import { PlusIcon, PlayIcon, ArchiveIcon, UsersIcon } from "lucide-react";

export default function AdminHackathonsPage() {
  const {
    data: hackathonData,
    isLoading,
    refetch,
  } = useFetch<{
    items: HackathonsAPI.HackathonSummary[];
  }>("/api/hackathons");
  const data = hackathonData?.items ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "launch" | "archive" | "assign";
    name: string;
  } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, teamSize }),
      });
      const json = await res.json();
      if (json.ok) {
        setCreateOpen(false);
        setName("");
        setDescription("");
        setTeamSize(4);
        await refetch();
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleAction() {
    if (!confirmAction) return;
    setIsActioning(true);

    try {
      if (confirmAction.type === "assign") {
        await fetch(`/api/hackathons/${confirmAction.id}/assign-teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } else {
        const status: HackathonStatus =
          confirmAction.type === "launch" ? "active" : "archived";
        await fetch(`/api/hackathons/${confirmAction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      }
      setConfirmAction(null);
      await refetch();
    } finally {
      setIsActioning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hackathons</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-1 h-4 w-4" />
              Create Hackathon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Hackathon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="Hackathon name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <textarea
                className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Team size"
                min={2}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !name.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && data.length === 0 && (
        <EmptyState
          title="No hackathons yet"
          description="Create your first hackathon to get started"
        />
      )}

      {data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Event Code</TableHead>
              <TableHead className="text-right">Teams</TableHead>
              <TableHead className="text-right">Hackers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell>
                  <StatusBadge status={h.status} />
                </TableCell>
                <TableCell className="font-mono">{h.eventCode}</TableCell>
                <TableCell className="text-right">{h.teamCount}</TableCell>
                <TableCell className="text-right">{h.hackerCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {h.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmAction({
                            id: h.id,
                            type: "launch",
                            name: h.name,
                          })
                        }
                      >
                        <PlayIcon className="mr-1 h-3 w-3" />
                        Launch
                      </Button>
                    )}
                    {h.status === "active" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirmAction({
                              id: h.id,
                              type: "assign",
                              name: h.name,
                            })
                          }
                        >
                          <UsersIcon className="mr-1 h-3 w-3" />
                          Assign Teams
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirmAction({
                              id: h.id,
                              type: "archive",
                              name: h.name,
                            })
                          }
                        >
                          <ArchiveIcon className="mr-1 h-3 w-3" />
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.type === "launch"
            ? "Launch hackathon?"
            : confirmAction?.type === "archive"
              ? "Archive hackathon?"
              : "Assign teams?"
        }
        description={
          confirmAction?.type === "launch"
            ? `Launch "${confirmAction.name}"? The event code will become usable for hackers to join.`
            : confirmAction?.type === "archive"
              ? `Archive "${confirmAction?.name}"? This hackathon will become read-only.`
              : `Randomly assign hackers into teams for "${confirmAction?.name}" using Fisher-Yates shuffle?`
        }
        confirmLabel={
          confirmAction?.type === "launch"
            ? "Launch"
            : confirmAction?.type === "archive"
              ? "Archive"
              : "Assign"
        }
        variant={confirmAction?.type === "archive" ? "destructive" : "default"}
        onConfirm={handleAction}
        isLoading={isActioning}
      />
    </div>
  );
}
