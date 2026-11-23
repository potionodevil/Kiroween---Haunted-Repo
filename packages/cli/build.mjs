// Bundles the CLI (with core, github and mcp sources) into one ESM file for npx.
// eslint, its TS parser and typescript stay external: they are regular dependencies.
import { build } from "esbuild";

await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: { js: "#!/usr/bin/env node\nimport { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  external: ["eslint", "@typescript-eslint/parser", "typescript"],
  legalComments: "none",
});
console.log("built dist/cli.js");
