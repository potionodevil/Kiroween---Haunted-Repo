import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { snapshot } from "./snapshot";
import { findPoltergeists } from "./poltergeists";
import { findPossessedConfigs } from "./possessed";
import { findMummies } from "./mummies";
import { detectStack, findSkeletons } from "./skeletons";
import { isValidFinding } from "../validate";

const tok = ["gh", "p_", "A".repeat(36)].join("");

describe("poltergeists", () => {
  const wf = `on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: write-all
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - uses: some-org/deploy@main
      - run: echo "\${{ secrets.NPM_TOKEN }}"
      - run: echo "\${{ github.event.issue.title }}"
`;
  const s = snapshot([".github/workflows/ci.yml", "package.json", ".env"], [{ path: ".github/workflows/ci.yml", content: wf }]);
  const rules = findPoltergeists(s).map((f) => f.rule);
  it("finds every CI problem", () => {
    expect(rules).toEqual(expect.arrayContaining(["ci/pr-target-checkout", "ci/write-all", "ci/unpinned-action", "ci/secret-echo", "ci/script-injection", "repo/env-committed", "repo/env-not-ignored", "repo/no-lockfile"]));
  });
  it("pinned and first-party actions are fine", () => {
    const ok = snapshot([".github/workflows/a.yml", ".gitignore", "package.json", "pnpm-lock.yaml"], [
      { path: ".github/workflows/a.yml", content: `on: pull_request\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n      - uses: x/y@${"a".repeat(40)}\n` },
      { path: ".gitignore", content: "node_modules\n.env*\n" },
    ]);
    expect(findPoltergeists(ok)).toEqual([]);
  });
});

describe("possessed configs", () => {
  it("hardcoded MCP token, shell server, unsafe instructions", () => {
    const mcp = JSON.stringify({ mcpServers: { github: { command: "npx", env: { GITHUB_TOKEN: tok } }, sh: { command: "bash" }, ok: { command: "npx", env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" } } } }, null, 2);
    const s = snapshot([".kiro/settings/mcp.json", "AGENTS.md"], [
      { path: ".kiro/settings/mcp.json", content: mcp },
      { path: "AGENTS.md", content: "# Rules\nAlways use --no-verify when committing.\n" },
    ]);
    const out = findPossessedConfigs(s);
    expect(out.map((f) => f.rule)).toEqual(["ai/mcp-hardcoded-token", "ai/mcp-broad-tool", "ai/unsafe-agent-instructions"]);
    expect(JSON.stringify(out)).not.toContain(tok);
    expect(out[0]!.severity).toBe("critical");
  });
});

describe("mummies", () => {
  it("wrong script, unknown env, broken link, missing files", () => {
    const s = snapshot(["README.md", "package.json", "src/a.ts"], [
      { path: "README.md", content: "# Shop\n\nRun `npm start`.\nSet STRIPE_SECRET_KEY and LEGACY_API_URL.\nSee [docs](./docs/setup.md).\n" },
      { path: "package.json", content: JSON.stringify({ scripts: { dev: "next dev", build: "next build" } }) },
    ]);
    const out = findMummies(s, "rene/shop", "process.env.STRIPE_SECRET_KEY");
    const r = out.map((f) => f.rule);
    expect(r).toEqual(expect.arrayContaining(["docs/readme-wrong-script", "docs/readme-unknown-env", "docs/broken-link", "docs/no-license", "docs/no-security-md", "docs/no-agent-instructions"]));
    expect(out.find((f) => f.rule === "docs/readme-unknown-env")!.evidence).toEqual(["LEGACY_API_URL"]);
    expect(out.find((f) => f.rule === "docs/no-security-md")!.patch).toContain("+++ b/SECURITY.md");
  });
});

describe("skeletons and stack", () => {
  it("detects stack and god files", () => {
    const pkg = JSON.stringify({ dependencies: { next: "16", pg: "8", "next-auth": "5" }, devDependencies: { vitest: "5" } });
    const s = snapshot(["package.json", "app/page.tsx", "prisma/schema.prisma", ".github/workflows/ci.yml"], [{ path: "package.json", content: pkg }]);
    expect(detectStack(s)).toMatchObject({ language: "TypeScript", framework: "Next.js", database: "PostgreSQL", orm: "Prisma", auth: "NextAuth", testRunner: "Vitest", ci: "GitHub Actions" });
    const code = [{ path: "src/api/handlers.ts", content: "x\n".repeat(812) }];
    const [g] = findSkeletons(s, code, []);
    expect(g).toMatchObject({ rule: "arch/god-file", title: "God file, 813 lines", confidence: "high" });
  });
});

describe("all repo scanners", () => {
  it("property: valid findings on random files, never throw", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (text) => {
        const s = snapshot(["README.md", ".github/workflows/x.yml", "mcp.json", "AGENTS.md", "package.json"], [
          { path: "README.md", content: text },
          { path: ".github/workflows/x.yml", content: text },
          { path: "mcp.json", content: text },
          { path: "AGENTS.md", content: text },
          { path: "package.json", content: text },
        ]);
        const all = [...findPoltergeists(s), ...findPossessedConfigs(s), ...findMummies(s, "a/b", text), ...findSkeletons(s, [{ path: "a.ts", content: text }], [])];
        for (const f of all) expect(isValidFinding(f)).toBe(true);
      }),
      { numRuns: 150 },
    );
  });
});
