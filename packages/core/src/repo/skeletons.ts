import type { Finding } from "../types";
import { finding, has, read, type RepoSnapshot } from "./snapshot";

export interface StackCard {
  language: string;
  framework?: string;
  database?: string;
  orm?: string;
  auth?: string;
  hosting?: string;
  testRunner?: string;
  ci?: string;
}

function deps(s: RepoSnapshot): Set<string> {
  const out = new Set<string>();
  for (const p of s.paths.filter((x) => /(^|\/)package\.json$/.test(x))) {
    try {
      const j = JSON.parse(read(s, p) ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      for (const k of Object.keys({ ...j.dependencies, ...j.devDependencies })) out.add(k);
    } catch {
      /* skip invalid package.json */
    }
  }
  return out;
}

const pick = (d: Set<string>, table: [string, string][]) => table.find(([dep]) => d.has(dep))?.[1];

/** Stack detection from manifests, lockfiles and config files. Only states what files prove. */
export function detectStack(s: RepoSnapshot): StackCard {
  const d = deps(s);
  const ext = (re: RegExp) => s.paths.filter((p) => re.test(p)).length;
  const ts = ext(/\.(ts|tsx)$/);
  const js = ext(/\.(js|jsx|mjs|cjs)$/);
  const py = ext(/\.py$/);
  const go = ext(/\.go$/);
  const language = [["TypeScript", ts], ["JavaScript", js], ["Python", py], ["Go", go]].sort((a, b) => (b[1] as number) - (a[1] as number))[0]![0] as string;
  const compose = read(s, "docker-compose.yml") ?? read(s, "docker-compose.yaml") ?? "";
  return {
    language,
    framework: pick(d, [["next", "Next.js"], ["nuxt", "Nuxt"], ["@remix-run/node", "Remix"], ["@sveltejs/kit", "SvelteKit"], ["astro", "Astro"], ["express", "Express"], ["fastify", "Fastify"], ["@nestjs/core", "NestJS"], ["hono", "Hono"], ["react", "React"], ["vue", "Vue"]]) ?? (py ? (/django/i.test(read(s, "requirements.txt") ?? "") ? "Django" : /flask/i.test(read(s, "requirements.txt") ?? "") ? "Flask" : undefined) : undefined),
    database: pick(d, [["pg", "PostgreSQL"], ["postgres", "PostgreSQL"], ["mysql2", "MySQL"], ["mongodb", "MongoDB"], ["mongoose", "MongoDB"], ["better-sqlite3", "SQLite"], ["redis", "Redis"], ["@supabase/supabase-js", "Supabase (PostgreSQL)"]]) ?? (/postgres/i.test(compose) ? "PostgreSQL" : /mongo/i.test(compose) ? "MongoDB" : /mysql/i.test(compose) ? "MySQL" : undefined),
    orm: has(s, /(^|\/)schema\.prisma$/) ? "Prisma" : pick(d, [["drizzle-orm", "Drizzle"], ["typeorm", "TypeORM"], ["sequelize", "Sequelize"], ["mongoose", "Mongoose"], ["knex", "Knex"]]),
    auth: pick(d, [["next-auth", "NextAuth"], ["@auth/core", "Auth.js"], ["@clerk/nextjs", "Clerk"], ["passport", "Passport"], ["lucia", "Lucia"], ["@supabase/auth-helpers-nextjs", "Supabase Auth"]]),
    hosting: has(s, /^vercel\.json$/) ? "Vercel" : has(s, /^netlify\.toml$/) ? "Netlify" : has(s, /^(Dockerfile|fly\.toml)$/) ? "Container" : d.has("next") ? "Vercel (likely)" : undefined,
    testRunner: pick(d, [["vitest", "Vitest"], ["jest", "Jest"], ["mocha", "Mocha"], ["@playwright/test", "Playwright"], ["cypress", "Cypress"]]) ?? (py && has(s, /(^|\/)(test_|conftest\.py)/) ? "pytest" : undefined),
    ci: has(s, /^\.github\/workflows\//) ? "GitHub Actions" : has(s, /^\.gitlab-ci\.yml$/) ? "GitLab CI" : has(s, /^\.circleci\//) ? "CircleCI" : undefined,
  };
}

/** Architecture problems. Every skeleton carries confidence and evidence (master prompt, feature 27). */
export function findSkeletons(s: RepoSnapshot, code: { path: string; content: string }[], spiderSqlFiles: string[]): Finding[] {
  const out: Finding[] = [];
  const god = code
    .map((f) => ({ path: f.path, lines: f.content.split("\n").length }))
    .filter((f) => f.lines > 500 && !/\.(test|spec)\.|generated|\.d\.ts$/.test(f.path))
    .sort((a, b) => b.lines - a.lines);
  for (const g of god.slice(0, 5)) {
    out.push(
      finding("skeleton", g.lines > 1000 ? "warning" : "low", "arch/god-file", `God file, ${g.lines} lines`, g.path,
        `${g.path} has ${g.lines} lines. Files this big mix concerns and are hard to review and test.`,
        "Split it by responsibility (routes, data access, helpers). Keep what you have if it is generated or rarely changed.",
        { confidence: "high", evidence: [`${g.path}: ${g.lines} lines`] }),
    );
  }

  const codeCount = code.length;
  const tests = s.paths.filter((p) => /(\.|_)(test|spec)\.[a-z]+$|(^|\/)(__tests__|tests?)\//i.test(p));
  if (codeCount >= 10 && tests.length === 0) {
    out.push(
      finding("skeleton", "warning", "arch/no-tests", "No tests", "package.json",
        `${codeCount} code files and not a single test file. Every change is a guess.`,
        "Start with one test per critical path (checkout, login). Vitest or Jest take minutes to set up.",
        { confidence: "high", evidence: [`${codeCount} code files`, "0 files matching *.test.* / *.spec.* / tests/"] }),
    );
  }

  if (codeCount >= 5 && !has(s, /^(\.github\/workflows\/|\.gitlab-ci\.yml|\.circleci\/)/)) {
    out.push(
      finding("skeleton", "low", "arch/no-ci", "No CI", ".github/workflows",
        "No CI configuration. Tests and builds only run when someone remembers to.",
        "Add a GitHub Actions workflow that installs, builds and tests on every pull request.",
        { confidence: "high", evidence: ["no .github/workflows, .gitlab-ci.yml or .circleci"] }),
    );
  }

  if (spiderSqlFiles.length >= 2) {
    out.push(
      finding("skeleton", "low", "arch/raw-sql-strings", "Raw SQL built by hand", spiderSqlFiles[0]!,
        `${spiderSqlFiles.length} files build SQL strings themselves. That spreads injection risk across the code base.`,
        "Keep your database, but route queries through one data layer with a query builder (Kysely, Drizzle) or parameterized helpers. Migration cost: medium.",
        { confidence: "medium", evidence: spiderSqlFiles.slice(0, 10) }),
    );
  }
  return out;
}
