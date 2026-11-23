# Requirements: scanners (vampires, spiders, bats, zombies, poltergeists, possessed, mummies, skeletons)

## R1 Shared pipeline
1. Every scanner SHALL return findings in the shared Finding shape and pass `isValidFinding`.
2. Every scanner SHALL never throw on any input (property-based tested).
3. Code scanners SHALL share one ESLint pipeline (`@haunted/core/code`) with custom `haunted/*` rules.

## R2 Vampires
1. WHEN a lockfile (package-lock v1-v3, pnpm v5/v6/v9, yarn v1, pinned requirements.txt) is present THEN the system SHALL query OSV.dev and create one vampire per vulnerable package version.
2. Each vampire SHALL carry severity from the GHSA label or CVSS, CWE, OWASP A06, the dependency path and the minimal upgrade that fixes every advisory.
3. WHEN the package is a direct dependency THEN the system SHALL offer a package.json diff.

## R3 Spiders, bats, possessed code, zombies
1. Spiders: eval and new Function, innerHTML and dangerouslySetInnerHTML, SQL built by concatenation, exec with built strings, md5/sha1, TLS off, CORS * with credentials.
2. Bats: awaited queries in loops, whole-library imports (lodash autofix), listener leaks in effects, independent sequential awaits.
3. Possessed: model output into exec, eval or query; user input inside prompts.
4. Zombies: floating promises plus ESLint core rules; ESLint fixes and first suggestions become per-finding diffs.

## R4 Repo creatures
1. Poltergeists: pull_request_target with PR checkout, script injection, echoed secrets, write-all, unpinned third-party actions, committed .env, .env not ignored (diff), no lockfile.
2. Possessed configs: tokens in MCP configs (never shown), shell or auto-approve-all MCP servers, agent instructions that switch off safety.
3. Mummies: no README, README scripts that do not exist, env variables the code never reads, broken relative links, no license, no SECURITY.md (diff), no agent instructions.
4. Skeletons: god files, no tests, no CI, raw SQL across files; every skeleton has confidence and evidence; a stack card is detected.
