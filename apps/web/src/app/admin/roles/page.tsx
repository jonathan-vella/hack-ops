"use client";

import { useState } from "react";
import type { HackathonsAPI, RolesAPI } from "@hackops/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HackathonPicker } from "@/components/hackathon-picker";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useFetch } from "@/lib/hooks/use-fetch";
import { PlusIcon, ShieldIcon, TrashIcon } from "lucide-react";

export default function AdminRolesPage() {
  const { data: hackathons } =
    useFetch<HackathonsAPI.HackathonSummary[]>("/api/hackathons");
  const [selectedHackathon, setSelectedHackathon] = useState("");

  const rolesUrl = selectedHackathon
    ? `/api/roles?hackathonId=${selectedHackathon}`
    : null;
  const { data: rolesData, isLoading, refetch } =
    useFetch<{ items: RolesAPI.RoleRecord[] }>(rolesUrl);
  const roles = rolesData?.items ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [githubLogin, setGithubLogin] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "coach">("coach");
  const [isInviting, setIsInviting] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    login: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleInvite() {
    setIsInviting(true);
    try {
      const res = await fetch("/api/roles/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathonId: selectedHackathon,
          githubLogin,
          role: inviteRole,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setInviteOpen(false);
        setGithubLogin("");
        await refetch();
      }
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await fetch(`/api/roles/${removeTarget.id}`, {
        method: "DELETE",
      });
      setRemoveTarget(null);
      await refetch();
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
        <div className="flex items-center gap-3">
          <HackathonPicker
            hackathons={hackathons ?? []}
            value={selectedHackathon}
            onValueChange={setSelectedHackathon}
            className="w-64"
          />
          {selectedHackathon && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-1 h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Input
                    placeholder="GitHub username"
                    value={githubLogin}
                    onChange={(e) => setGithubLogin(e.target.value)}
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "admin" | "coach")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={isInviting || !githubLogin.trim()}
                  >
                    {isInviting ? "Inviting..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedHackathon && (
        <EmptyState
          title="Select a hackathon"
          description="Choose a hackathon to manage role assignments"
        />
      )}

      {selectedHackathon && isLoading && <TableSkeleton />}

      {selectedHackathon && !isLoading && roles.length === 0 && (
        <EmptyState
          title="No roles assigned"
          description="Invite users to assign them roles in this hackathon"
        />
      )}

      {roles.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="flex items-center gap-2 font-medium">
                  {r.githubLogin}
                  {r.isPrimaryAdmin && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      <ShieldIcon className="mr-1 h-3 w-3" />
                      Primary
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="capitalize">{r.role}</TableCell>
                <TableCell>{r.assignedBy}</TableCell>
                <TableCell>
                  {new Date(r.assignedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={r.isPrimaryAdmin}
                    onClick={() =>
                      setRemoveTarget({ id: r.id, login: r.githubLogin })
                    }
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove role?"
        description={
          removeTarget
            ? `Remove ${removeTarget.login}'s role from this hackathon?`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
        isLoading={isRemoving}
      />
    </div>
  );
}
