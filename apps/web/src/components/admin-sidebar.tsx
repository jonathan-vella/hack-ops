"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardListIcon,
  FileTextIcon,
  SettingsIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin/hackathons", label: "Hackathons", icon: TrophyIcon },
  { href: "/admin/teams", label: "Teams", icon: UsersIcon },
  { href: "/admin/rubrics", label: "Rubrics", icon: FileTextIcon },
  { href: "/admin/audit", label: "Audit Trail", icon: ClipboardListIcon },
  { href: "/admin/roles", label: "Roles", icon: ShieldIcon },
  { href: "/admin/config", label: "Config", icon: SettingsIcon },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r md:block">
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
