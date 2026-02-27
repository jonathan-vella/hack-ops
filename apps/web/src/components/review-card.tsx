"use client";

import { useState } from "react";
import type { SubmissionsAPI } from "@hackops/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";

interface ReviewCardProps {
  submission: SubmissionsAPI.SubmissionRecord;
  onReview?: () => void;
}

export function ReviewCard({ submission, onReview }: ReviewCardProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(status: "approved" | "rejected") {
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Review failed");
        return;
      }

      setReason("");
      onReview?.();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Submission from {submission.submittedBy}
        </CardTitle>
        <StatusBadge status={submission.state} />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{submission.description}</p>
        {submission.attachments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Attachments
            </p>
            {submission.attachments.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary underline"
              >
                {url}
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(submission.submittedAt).toLocaleString()}
        </p>

        {submission.state === "pending" && (
          <div className="space-y-2 border-t pt-3">
            <Input
              placeholder="Review reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleReview("approved")}
                disabled={isSubmitting || !reason.trim()}
              >
                <CheckCircleIcon className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReview("rejected")}
                disabled={isSubmitting || !reason.trim()}
              >
                <XCircleIcon className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
