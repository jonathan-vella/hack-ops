import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/sql";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrophyIcon, ArrowRightIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboards — HackOps",
  description: "Browse hackathon leaderboards",
};

interface HackathonSummary {
  id: string;
  name: string;
  status: string;
}

export default async function LeaderboardIndexPage() {
  let hackathons: HackathonSummary[] = [];

  try {
    hackathons = await query<HackathonSummary>(
      "SELECT id, name, status FROM hackathons WHERE status IN ('active', 'judging') ORDER BY name",
    );
  } catch {
    hackathons = [];
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <TrophyIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Select a hackathon to view its live leaderboard.
        </p>
      </header>

      {hackathons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrophyIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No active hackathons</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leaderboards will appear here once hackathons are active.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {hackathons.map((h) => (
            <Link key={h.id} href={`/leaderboard/${h.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{h.name}</CardTitle>
                  <Badge variant="secondary">{h.status}</Badge>
                </CardHeader>
                <CardContent className="flex items-center gap-1 text-sm text-muted-foreground">
                  View leaderboard
                  <ArrowRightIcon className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
