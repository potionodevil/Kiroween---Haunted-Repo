# Design: watcher CLI

- `packages/cli` (npm name `haunted-repo`), bundled with esbuild into `dist/cli.js`; eslint, the parser and typescript stay external dependencies.
- `exorcise.ts`: `locateSecrets` (core, local only) finds raw spans; replacements run from the end of the file; the env name comes from the ritual template and is deduplicated.
- `hook.ts`: scans the added lines of `git diff --cached -U0` with `scanPatch`; low-severity samples do not block.
- `watch`: `fs.watch(root, { recursive: true })`, ignoring node_modules, .git, .haunted, dist, .next and .env files.
