import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-1f6ef2bce8ec46fa9b8fd340b1b671fd.r2.dev",
      },
    ],
  },
};

export default nextConfig;
