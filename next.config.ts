import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The gitagent SDK is Node-native (git, fs, child_process). Keep it external so
  // Next doesn't try to bundle it into the server build.
  serverExternalPackages: ["@open-gitagent/gitagent"],
  // Hide the Next.js dev indicator (the floating badge in the bottom-left).
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
};

export default nextConfig;
