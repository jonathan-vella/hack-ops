"use client";

import { useState } from "react";
import type { RubricsAPI, RubricCategory } from "@hackops/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { RubricForm } from "@/components/rubric-form";
import { useFetch } from "@/lib/hooks/use-fetch";
import { PlusIcon, CheckCircleIcon } from "lucide-react";

export default function AdminRubricsPage() {
  const { data, isLoading, refetch } =
    useFetch<{ items: RubricsAPI.RubricRecord[] }>("/api/rubrics");
  const rubrics = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [activateId, setActivateId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  async function handleCreate(categories: RubricCategory[]) {
    const res = await fetch("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Failed to create rubric");
    setCreateOpen(false);
    await refetch();
  }

  async function handleActivate() {
    if (!activateId) return;
    setIsActivating(true);
    try {
      await fetch(`/api/rubrics/${activateId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setActivateId(null);
      await refetch();
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rubrics</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-1 h-4 w-4" />
              Create Rubric
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Rubric</DialogTitle>
            </DialogHeader>
            <RubricForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && rubrics.length === 0 && (
        <EmptyState
          title="No rubrics yet"
          description="Create a rubric to define scoring categories"
        />
      )}

      {rubrics.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rubrics.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">v{r.version}</TableCell>
                <TableCell>{r.categories.length} categories</TableCell>
                <TableCell>
                  {r.isActive ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(r.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {!r.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivateId(r.id)}
                    >
                      <CheckCircleIcon className="mr-1 h-3 w-3" />
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!activateId}
        onOpenChange={(open) => !open && setActivateId(null)}
        title="Activate rubric?"
        description="This will deactivate the current active rubric and switch to the selected version. Existing scores are not affected."
        confirmLabel="Activate"
        onConfirm={handleActivate}
        isLoading={isActivating}
      />
    </div>
  );
}
