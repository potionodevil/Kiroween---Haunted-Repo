import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@haunted/core", "@haunted/github"],
  // The code pipeline loads these at runtime; bundling them breaks their dynamic requires.
  serverExternalPackages: ["eslint", "@typescript-eslint/parser", "typescript"],
  // Trace files from the monorepo root so workspace packages are included on Vercel.
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
};

export default nextConfig;
