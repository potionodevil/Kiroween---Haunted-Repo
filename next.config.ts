import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A stray package-lock.json in the home folder confuses root detection.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
