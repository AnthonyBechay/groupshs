import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Top-level in Next 16. It used to sit under `experimental`, where it was
  // silently ignored — so the per-build id the Dockerfile generates never took
  // effect, and after a deploy anyone with the site already open could hit
  // "failed to load chunk" when navigating, their old JS pointing at chunks that
  // no longer exist. With it set, Next detects the version skew and reloads.
  deploymentId: process.env.DEPLOYMENT_ID,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
