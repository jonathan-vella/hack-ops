"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircleIcon } from "lucide-react";

/**
 * Branded post-login callback page.
 * Auto-redirects authenticated users to /dashboard after a brief confirmation.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircleIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to HackOps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You&apos;ve signed in successfully. Redirecting to your dashboard
            {countdown > 0 ? ` in ${countdown}s` : ""}...
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
