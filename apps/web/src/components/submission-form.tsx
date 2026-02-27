"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubmissionFormProps {
  challengeId: string;
  onSuccess?: () => void;
}

export function SubmissionForm({ challengeId, onSuccess }: SubmissionFormProps) {
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const body = {
        challengeId,
        description: description.trim(),
        attachments: attachments
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Submission failed");
        return;
      }

      setDescription("");
      setAttachments("");
      onSuccess?.();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit Evidence</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              className="flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe your solution and how it meets the challenge requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="attachments" className="text-sm font-medium">
              Attachment URLs (one per line, optional)
            </label>
            <Input
              id="attachments"
              placeholder="https://github.com/..."
              value={attachments}
              onChange={(e) => setAttachments(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isSubmitting || !description.trim()}>
            {isSubmitting ? "Submitting..." : "Submit Evidence"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
