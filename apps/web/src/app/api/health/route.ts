import { NextResponse } from "next/server";
import type { HealthAPI } from "@hackops/shared";

export async function GET() {
  const body: HealthAPI.HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
