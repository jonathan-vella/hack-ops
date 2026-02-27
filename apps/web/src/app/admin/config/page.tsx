"use client";

import { useState } from "react";
import type { ConfigAPI } from "@hackops/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useFetch } from "@/lib/hooks/use-fetch";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";

const READ_ONLY_KEYS = new Set(["primaryAdminId"]);

export default function AdminConfigPage() {
  const { data, isLoading, refetch } =
    useFetch<{ items: ConfigAPI.ConfigRecord[] }>("/api/config");
  const configs = data?.items ?? [];

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(config: ConfigAPI.ConfigRecord) {
    setEditingKey(config.key);
    setEditValue(String(config.value));
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  async function saveEdit(key: string) {
    setIsSaving(true);
    try {
      let parsedValue: string | number | boolean = editValue;
      if (editValue === "true") parsedValue = true;
      else if (editValue === "false") parsedValue = false;
      else if (!isNaN(Number(editValue)) && editValue.trim() !== "")
        parsedValue = Number(editValue);

      const res = await fetch(`/api/config/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsedValue }),
      });
      const json = await res.json();
      if (json.ok) {
        setEditingKey(null);
        await refetch();
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration</h1>

      {isLoading && <TableSkeleton />}

      {!isLoading && configs.length === 0 && (
        <EmptyState
          title="No configuration entries"
          description="Configuration entries will appear here once initialized"
        />
      )}

      {configs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Updated By</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => {
              const isEditing = editingKey === config.key;
              const isReadOnly = READ_ONLY_KEYS.has(config.key);

              return (
                <TableRow key={config.key}>
                  <TableCell className="font-mono text-sm">
                    {config.key}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono text-sm">
                        {String(config.value)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{config.updatedBy}</TableCell>
                  <TableCell>
                    {new Date(config.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEdit(config.key)}
                          disabled={isSaving}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={isSaving}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isReadOnly}
                        onClick={() => startEdit(config)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
