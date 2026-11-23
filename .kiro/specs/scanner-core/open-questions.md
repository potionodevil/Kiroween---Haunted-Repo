# Open questions and risks for M1

Each item has a recommended answer. Review before task 1 starts.

| # | Question or risk | Recommendation |
|---|---|---|
| 1 | Scope: 33 features in about 10 days for one person. | Treat M1 and M2 as the submission. M3 only demo-first parts (watcher CLI, pre-commit hook, MCP server). Everything in M4 is optional. |
| 2 | Monorepo move costs about half a day now and more later. | Do it now, before vampires. Use pnpm via `corepack enable` (pnpm is not installed yet, corepack 0.36 is). |
| 3 | Stable id "rule + file + line + commit" splits one secret into many ghosts. | Ghost id = rule + hash of the secret value (design table). Vampire id = osv id + package + version. |
| 4 | Feature 22: the web app cannot know whether the user owns the repo without OAuth. | Real scans show only the key type by default. Masked values appear after GitHub OAuth proves ownership (M3b, when OAuth exists anyway). Demo repo shows masked values. |
| 5 | GitHub rate limit: one full scan uses up to about 310 API calls. With a token that is about 15 scans per hour. | Cache results per commit SHA in memory and in Vercel's runtime cache. Show cached results with their age. Keep the demo button prominent for video and judges. |
| 6 | Vercel function duration: 60 s scan budget plus OSV calls. | Set `maxDuration = 60`. Start OSV in parallel with the diff loading, not after it. |
| 7 | OSV querybatch returns only ids, details need one call per id. | Concurrency 8, unique ids only, 10 s budget for OSV inside the 60 s. Skip with a note when over. |
| 8 | `pnpm-lock.yaml` needs a YAML parser; core must stay I/O free. | Parse YAML in the web app with the `yaml` package, pass plain objects to core. |
| 9 | `yarn.lock` v1 has no dependency paths; yarn berry is a different format. | Support yarn v1 without paths. Berry is out of M1. |
| 10 | Hashing in core without `node:crypto`. | Use the Web Crypto API (`crypto.subtle`), which exists in Node, browsers and edge. Core functions that hash become async, or the caller passes a hash function. Recommend caller-supplied hash: keeps core sync. |
| 11 | Sprites exist for 3 of 10 kinds. | Add vampire in M1 with the same Python script. Others get a labeled placeholder until their milestone. |
| 12 | Deadline: the master prompt says 4 Dec 14:00 PT, plan v2 says 23:00 CET. | Same moment (14:00 PT = 23:00 CET). Aim to submit Thu 3 Dec. |
| 13 | Vercel Sandbox (feature 26) on Hobby has limited CPU per month. | Build it last in M3, demo-first, cached per SHA, prepared demo run as fallback. |
| 14 | `npx haunted-repo …` commands in the ritual and README need a published npm package. | Publish `haunted-repo` from `packages/cli` in M3. Until then the ritual says "coming soon" for step 4. |
