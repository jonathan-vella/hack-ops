import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ClipboardListIcon,
  ArrowRightIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
  PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: UsersIcon,
    title: "Team Management",
    description:
      "Form teams, assign coaches, and manage participants with role-based access.",
  },
  {
    icon: ClipboardListIcon,
    title: "Challenge Tracks",
    description:
      "Structured challenges with rubric-based scoring across Azure technology domains.",
  },
  {
    icon: TrophyIcon,
    title: "Live Leaderboard",
    description:
      "Real-time scoring and progression tracking with public leaderboard views.",
  },
  {
    icon: ShieldIcon,
    title: "Enterprise Security",
    description:
      "GitHub SSO, role guards, and audit logging built on Azure App Service.",
  },
  {
    icon: PlayIcon,
    title: "Quick Onboarding",
    description:
      "4-digit event codes let participants join hackathons in seconds.",
  },
  {
    icon: ArrowRightIcon,
    title: "Azure-Native",
    description:
      "Powered by Cosmos DB, App Service, and Application Insights on Azure.",
  },
] as const;

export default async function Home() {
  const h = await headers();
  const hasPrincipal = !!h.get("x-ms-client-principal");
  const isDev =
    process.env.NODE_ENV === "development" && !!process.env.DEV_USER_ID;

  if (hasPrincipal || isDev) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="flex flex-col items-center gap-6 px-6 pt-24 pb-16 text-center">
        <Badge variant="secondary" className="text-sm">
          Open-source hackathon platform
        </Badge>
        <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight sm:text-6xl">
          Run Azure hackathons
          <span className="text-primary"> that scale</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          HackOps is a management platform for structured Microsoft Azure
          learning events. Organize challenges, manage teams, score submissions,
          and track progress — all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button asChild size="lg">
            <a href="/.auth/login/github?post_login_redirect_uri=%2Fdashboard">
              Sign in with GitHub
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a
              href="https://github.com/jonathan-vella/hack-ops"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Everything you need to run a hackathon
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <feature.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-6 text-center text-sm text-muted-foreground">
        Built with Next.js, Azure, and{" "}
        <a
          href="https://github.com/jonathan-vella/hack-ops"
          className="underline underline-offset-4 hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          open source
        </a>
        .
      </footer>
    </div>
  );
}
