"use client";

import Link from "next/link";
import type {
  HackathonsAPI,
  SubmissionsAPI,
  ProgressionAPI,
  ChallengesAPI,
  TeamsAPI,
  UserRole,
} from "@hackops/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/progress-bar";
import { ReviewCard } from "@/components/review-card";
import { ChallengeCard } from "@/components/challenge-card";
import { SubmissionForm } from "@/components/submission-form";
import { HackathonPicker } from "@/components/hackathon-picker";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/hooks/use-auth";
import { useFetch } from "@/lib/hooks/use-fetch";
import { useState } from "react";
import {
  ClipboardListIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

export default function DashboardPage() {
  const { highestRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
        {highestRole === "admin" && <AdminDashboard />}
        {highestRole === "coach" && <CoachDashboard />}
        {highestRole === "hacker" && <HackerDashboard />}
        {!highestRole && (
          <EmptyState
            title="No role assigned"
            description="Join a hackathon to get started"
            action={
              <Button asChild>
                <Link href="/join">Join Hackathon</Link>
              </Button>
            }
          />
        )}
      </main>
    </div>
  );
}

function AdminDashboard() {
  const { data: hackathons } =
    useFetch<HackathonsAPI.HackathonSummary[]>("/api/hackathons");
  const { data: submissions } = useFetch<{
    items: SubmissionsAPI.SubmissionRecord[];
  }>("/api/submissions?status=pending");

  const activeCount = hackathons?.filter((h) => h.status === "active").length ?? 0;
  const totalTeams = hackathons?.reduce((acc, h) => acc + h.teamCount, 0) ?? 0;
  const pendingCount = submissions?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Hackathons" value={activeCount} icon={<TrophyIcon className="h-4 w-4" />} />
        <StatCard title="Total Teams" value={totalTeams} icon={<UsersIcon className="h-4 w-4" />} />
        <StatCard
          title="Pending Submissions"
          value={pendingCount}
          icon={<ClipboardListIcon className="h-4 w-4" />}
        />
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/admin/hackathons">
            <PlusIcon className="mr-1 h-4 w-4" />
            Manage Hackathons
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/audit">View Audit Trail</Link>
        </Button>
      </div>

      {hackathons && hackathons.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Hackathons</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {hackathons.map((h) => (
              <Card key={h.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-base">{h.name}</CardTitle>
                  <StatusBadge status={h.status} />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Event code: <span className="font-mono">{h.eventCode}</span> ·{" "}
                  {h.teamCount} teams · {h.hackerCount} hackers
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoachDashboard() {
  const { data: hackathons } =
    useFetch<HackathonsAPI.HackathonSummary[]>("/api/hackathons");
  const [selectedHackathon, setSelectedHackathon] = useState("");

  const pendingUrl = selectedHackathon
    ? `/api/submissions?hackathonId=${selectedHackathon}&status=pending`
    : null;
  const { data: submissions, refetch } =
    useFetch<{ items: SubmissionsAPI.SubmissionRecord[] }>(pendingUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <HackathonPicker
          hackathons={hackathons ?? []}
          value={selectedHackathon}
          onValueChange={setSelectedHackathon}
          className="w-64"
        />
        {selectedHackathon && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/leaderboard/${selectedHackathon}`}>
              <TrophyIcon className="mr-1 h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
        )}
      </div>

      {!selectedHackathon && (
        <EmptyState
          title="Select a hackathon"
          description="Choose a hackathon to see pending submissions for review"
        />
      )}

      {selectedHackathon && submissions && submissions.items.length === 0 && (
        <EmptyState
          title="No pending submissions"
          description="All submissions have been reviewed"
        />
      )}

      {submissions && submissions.items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Pending Reviews ({submissions.items.length})
          </h2>
          {submissions.items.map((sub) => (
            <ReviewCard key={sub.id} submission={sub} onReview={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function HackerDashboard() {
  const { data: progression } = useFetch<ProgressionAPI.ProgressionRecord>(
    "/api/progression",
  );
  const hackathonId = progression?.hackathonId;

  const challengeUrl = hackathonId
    ? `/api/challenges?hackathonId=${hackathonId}`
    : null;
  const { data: challengeData } =
    useFetch<{ items: ChallengesAPI.ChallengeRecord[] }>(challengeUrl);

  const teamUrl = hackathonId
    ? `/api/teams?hackathonId=${hackathonId}`
    : null;
  const { data: teamData } =
    useFetch<{ items: TeamsAPI.TeamRecord[] }>(teamUrl);

  const challenges = challengeData?.items ?? [];
  const team = teamData?.items?.[0];
  const unlockedIds = new Set(
    progression?.unlockedChallenges?.map((u) => u.challengeId) ?? [],
  );
  const currentIdx = progression?.currentChallenge ?? 0;
  const completedCount = unlockedIds.size > 0 ? unlockedIds.size - 1 : 0;

  const currentChallenge = challenges.find((c) => c.order === currentIdx);

  return (
    <div className="space-y-6">
      {team && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{team.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {team.members.map((m) => (
                <Badge key={m.hackerId} variant="secondary">
                  {m.githubLogin}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {challenges.length > 0 && (
        <ProgressBar current={completedCount} total={challenges.length} />
      )}

      {hackathonId && (
        <div className="flex gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/leaderboard/${hackathonId}`}>
              <TrophyIcon className="mr-1 h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
        </div>
      )}

      {currentChallenge && (
        <SubmissionForm challengeId={currentChallenge.id} />
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Challenges</h2>
        {challenges
          .sort((a, b) => a.order - b.order)
          .map((ch) => (
            <ChallengeCard
              key={ch.id}
              challenge={ch}
              isUnlocked={unlockedIds.has(ch.id)}
              isCurrent={ch.order === currentIdx}
            />
          ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
