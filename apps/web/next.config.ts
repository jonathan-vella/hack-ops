import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@hackops/shared"],
  serverExternalPackages: [
    "@azure/monitor-opentelemetry",
    "@opentelemetry/api",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
  ],
};

export default nextConfig;
