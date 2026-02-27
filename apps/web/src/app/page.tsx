import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const h = await headers();
  const hasPrincipal = !!h.get("x-ms-client-principal");
  const isDev = process.env.NODE_ENV === "development" && !!process.env.DEV_USER_ID;

  if (hasPrincipal || isDev) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            HackOps
          </CardTitle>
          <p className="mt-2 text-muted-foreground">
            Hackathon management platform for structured Microsoft Azure
            learning events.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild size="lg">
            <a href="/.auth/login/github">Sign in with GitHub</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
