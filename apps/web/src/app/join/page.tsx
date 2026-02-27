"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinPage() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const code = eventCode.trim();
    if (!/^\d{4}$/.test(code)) {
      setError("Event code must be exactly 4 digits");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventCode: code }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to join hackathon");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Join a Hackathon</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 4-digit event code provided by your organizer
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="1234"
              maxLength={4}
              value={eventCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setEventCode(val);
              }}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || eventCode.length !== 4}
            >
              {isSubmitting ? "Joining..." : "Join Hackathon"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
