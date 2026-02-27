import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildLeaderboard } from "@/lib/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard-table";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const leaderboard = await buildLeaderboard(id);

  return {
    title: leaderboard
      ? `Leaderboard — ${leaderboard.hackathonName}`
      : "Leaderboard — HackOps",
    description: leaderboard
      ? `Live leaderboard for ${leaderboard.hackathonName}`
      : "Hackathon leaderboard",
  };
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { id } = await params;
  const leaderboard = await buildLeaderboard(id);

  if (!leaderboard) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {leaderboard.hackathonName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Live leaderboard — {leaderboard.entries.length} team
          {leaderboard.entries.length !== 1 ? "s" : ""} ranked
        </p>
      </header>

      <LeaderboardTable
        hackathonId={id}
        initialData={leaderboard}
      />
    </main>
  );
}
