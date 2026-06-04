import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: Next.js bundles only the node_modules actually used,
  // producing a self-contained .next/standalone directory (~500 MB vs ~3.7 GB).
  // The Docker runner stage uses `node .next/standalone/server.js` instead of
  // `npm run start`, so no full node_modules copy is needed in the image.
  output: "standalone",

  // The gitagent SDK is Node-native (git, fs, child_process). Keep it external so
  // Next doesn't try to bundle it into the server build.
  serverExternalPackages: ["@open-gitagent/gitagent"],

  // The agent/ repo is read at runtime via fs (not imported), so Next's file
  // tracing misses it. Force it into the server bundle for the agent API routes,
  // otherwise it's absent on serverless (Amplify/Lambda) → ENOENT.
  outputFileTracingIncludes: {
    "/api/agent/chat": ["./agent/**/*"],
    "/api/agent/manifest": ["./agent/**/*"],
    "/api/agent/fs": ["./agent/**/*"],
  },

  // Hide the Next.js dev indicator (the floating badge in the bottom-left).
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
};

export default nextConfig;
