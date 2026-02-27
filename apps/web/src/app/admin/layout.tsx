"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAuth } from "@/lib/hooks/use-auth";
import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { highestRole, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || highestRole !== "admin")) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, highestRole, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <LoadingSkeleton rows={4} className="w-64" />
        </div>
      </div>
    );
  }

  if (highestRole !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
