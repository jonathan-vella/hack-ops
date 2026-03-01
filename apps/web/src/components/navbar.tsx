"use client";

import Link from "next/link";
import type { UserRole } from "@hackops/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  LayoutDashboardIcon,
  MenuIcon,
  SettingsIcon,
  TrophyIcon,
  UserIcon,
  Zap,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ROLE_COLORS: Record<UserRole, string> = {
  admin:
    "border border-neon-purple/30 bg-neon-purple/10 text-neon-purple glow-purple",
  coach: "border border-neon-blue/30 bg-neon-blue/10 text-neon-blue glow-blue",
  hacker:
    "border border-neon-green/30 bg-neon-green/10 text-neon-green glow-green",
};

export function Navbar() {
  const { principal, highestRole, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neon-cyan/10 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="mr-2 md:hidden">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <nav className="mt-6 flex flex-col gap-2">
              <NavLinks role={highestRole} />
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          href="/dashboard"
          className="mr-6 flex items-center gap-2 font-bold font-mono text-neon-cyan"
        >
          <Zap className="h-5 w-5" />
          HACK<span className="text-neon-cyan">OPS</span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <NavLinks role={highestRole} />
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {!isLoading && principal && (
            <>
              {highestRole && (
                <Badge className={ROLE_COLORS[highestRole]}>
                  {highestRole}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <UserIcon className="mr-1 h-4 w-4" />
                    {principal.githubLogin}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  {highestRole === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/config">Settings</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/.auth/logout">Sign out</a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLinks({ role }: { role: UserRole | null }) {
  return (
    <>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <LayoutDashboardIcon className="h-4 w-4" />
        Dashboard
      </Link>
      {role === "admin" && (
        <Link
          href="/admin/hackathons"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="h-4 w-4" />
          Admin
        </Link>
      )}
      <Link
        href="/leaderboard"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <TrophyIcon className="h-4 w-4" />
        Leaderboard
      </Link>
    </>
  );
}
