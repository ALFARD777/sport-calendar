import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:5131";
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(projectDir, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/:path*` }];
  },
  /* config options here */
};

export default nextConfig;
