import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { redactLine } from "@haunted/core";

/**
 * Live séance (feature 26): clone, install, build and test a repo in a Vercel Sandbox.
 * Speaks JavaScript/TypeScript (npm, pnpm, yarn), Python, Go and Rust; finds the project at the root
 * or one folder down.
 * security.md rule 10: no env vars, tokens or keys go in; network is limited to package registries
 * during install and closed afterwards; the sandbox is always stopped.
 * Rule 11: no install scripts (npm --ignore-scripts, pip --only-binary=:all:).
 */
export type Tone = "ok" | "bad" | "warn" | "dim" | "cmd";
export type SeanceEvent =
  | { t: "line"; tone: Tone; text: string }
  | { t: "step"; step: Step; status: "run" | "pass" | "fail" | "skip" }
  | { t: "done"; build: Status; test: Status; failing: string[]; lang?: string }
  | { t: "error"; message: string };
export type Step = "boot" | "install" | "build" | "test";
type Status = "pass" | "fail" | "skip";
type Cmd = string; // run with sh -c inside the project folder

interface Plan {
  lang: string;
  dir: string;
  hosts: string[];
  install?: Cmd;
  build?: Cmd;
  test?: Cmd;
  /** Exit codes that mean "there were no tests". */
  noTests?: number[];
}

const ROOT = "/vercel/sandbox";
const MAX_LINES = 700;
const STEP_MS = { install: 150_000, build: 90_000, test: 90_000 };
const NPM_HOSTS = ["registry.npmjs.org", "*.npmjs.org", "registry.yarnpkg.com", "*.yarnpkg.com"];
const PY_HOSTS = ["pypi.org", "files.pythonhosted.org"];
const GO_HOSTS = ["proxy.golang.org", "sum.golang.org", "storage.googleapis.com"];
const RUST_HOSTS = ["crates.io", "index.crates.io", "static.crates.io"];
const GIT_HOSTS = ["github.com", "codeload.github.com", "objects.githubusercontent.com"];

function toneOf(text: string): Tone {
  if (/\b(FAIL|FAILED|failed|Error|ERR!|panic|✗|✖)\b/.test(text)) return "bad";
  if (/\b(PASS|passed|ok|✓|✔|Done|success)\b/.test(text)) return "ok";
  if (/\bwarn/i.test(text)) return "warn";
  return "dim";
}

function jsPlan(dir: string, files: Set<string>, scripts: Record<string, string>): Plan {
  const pm = files.has("pnpm-lock.yaml") ? "pnpm" : files.has("yarn.lock") ? "yarn" : "npm";
  const runner = pm === "npm" ? "npm run" : pm === "pnpm" ? "npx --yes pnpm@9 run" : "npx --yes yarn@1 run";
  const install =
    pm === "pnpm" ? "npx --yes pnpm@9 install --ignore-scripts --no-frozen-lockfile"
    : pm === "yarn" ? "npx --yes yarn@1 install --ignore-scripts"
    : `npm ${files.has("package-lock.json") ? "ci" : "install"} --ignore-scripts --no-audit --no-fund`;
  const hasTest = scripts.test && !/no test specified/.test(scripts.test);
  return { lang: `JavaScript (${pm})`, dir, hosts: NPM_HOSTS, install, build: scripts.build ? `${runner} build` : undefined, test: hasTest ? `${runner} test` : undefined };
}

function pyPlan(dir: string, files: Set<string>): Plan {
  const venv = "python3 -m venv /tmp/hr-venv && . /tmp/hr-venv/bin/activate";
  const deps = files.has("requirements.txt") ? " -r requirements.txt" : "";
  return {
    lang: "Python",
    dir,
    hosts: PY_HOSTS,
    install: `${venv} && pip install -q --only-binary=:all: pytest${deps}`,
    build: ". /tmp/hr-venv/bin/activate && python -m compileall -q .",
    test: ". /tmp/hr-venv/bin/activate && PYTHONPATH=. python -m pytest -q",
    noTests: [5],
  };
}

const goPlan = (dir: string): Plan => ({ lang: "Go", dir, hosts: GO_HOSTS, install: "go mod download", build: "go build ./...", test: "go test ./..." });
const rustPlan = (dir: string): Plan => ({ lang: "Rust", dir, hosts: RUST_HOSTS, install: "cargo fetch", build: "cargo build --offline", test: "cargo test --offline" });

export async function* runSeance(owner: string, repo: string, ref: string): AsyncGenerator<SeanceEvent> {
  let sandbox: Sandbox | null = null;
  let sent = 0;
  const line = (text: string, tone?: Tone): SeanceEvent | null => {
    if (sent >= MAX_LINES) return null;
    sent++;
    const clean = redactLine(text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").slice(0, 400));
    return { t: "line", tone: tone ?? toneOf(clean), text: clean };
  };

  /** Quiet command, returns stdout. */
  // Every command changes into the folder itself, so it never depends on the default working directory.
  const inDir = (dir: string, script: string) => `cd '${dir.replace(/'/g, "")}' && ${script}`;
  const read = async (script: string, cwd = ROOT): Promise<string> => {
    const c = await sandbox!.runCommand("sh", ["-c", inDir(cwd, script)]);
    return (await c.stdout().catch(() => "")).trim();
  };

  /** Streamed command, returns the exit code. */
  async function* exec(script: string, cwd: string, timeoutMs: number): AsyncGenerator<SeanceEvent, number> {
    const l = line(`$ ${script.replace(/^\. \/tmp\/hr-venv\/bin\/activate && /, "")}`, "cmd");
    if (l) yield l;
    const c = await sandbox!.runCommand({ cmd: "sh", args: ["-c", inDir(cwd, script)], detached: true, env: { CI: "1", FORCE_COLOR: "0", NO_COLOR: "1" }, timeoutMs });
    let buf = "";
    for await (const log of c.logs()) {
      buf += log.data;
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const p of parts) {
        if (!p.trim()) continue;
        const ev = line(p);
        if (ev) yield ev;
      }
    }
    if (buf.trim()) {
      const ev = line(buf);
      if (ev) yield ev;
    }
    const done = await c.wait();
    return done.exitCode ?? 1;
  }

  /** Finds the project: root first, then one folder down. */
  async function detect(): Promise<Plan | null> {
    const found = await read(
      "for d in . $(ls -d */ 2>/dev/null | grep -v node_modules | head -40); do for f in package.json pnpm-lock.yaml yarn.lock package-lock.json pyproject.toml requirements.txt setup.py go.mod Cargo.toml; do [ -f \"$d/$f\" ] && echo \"$d|$f\"; done; done",
    );
    const byDir = new Map<string, Set<string>>();
    for (const row of found.split("\n").filter(Boolean)) {
      const [d, f] = row.split("|");
      const dir = (d ?? ".").replace(/\/$/, "");
      byDir.set(dir, (byDir.get(dir) ?? new Set()).add(f!));
    }
    const dirs = [...byDir.keys()].sort((a, b) => (a === "." ? -1 : b === "." ? 1 : a.localeCompare(b)));
    for (const d of dirs) {
      const files = byDir.get(d)!;
      const cwd = d === "." ? ROOT : `${ROOT}/${d}`;
      if (files.has("package.json")) {
        let scripts: Record<string, string> = {};
        try {
          scripts = (JSON.parse(await read("cat package.json", cwd)) as { scripts?: Record<string, string> }).scripts ?? {};
        } catch {
          /* unreadable package.json: install only */
        }
        return jsPlan(cwd, files, scripts);
      }
      if (files.has("pyproject.toml") || files.has("requirements.txt") || files.has("setup.py")) return pyPlan(cwd, files);
      if (files.has("go.mod")) return goPlan(cwd);
      if (files.has("Cargo.toml")) return rustPlan(cwd);
    }
    return null;
  }

  try {
    yield { t: "step", step: "boot", status: "run" };
    sandbox = await Sandbox.create({
      source: { type: "git", url: `https://github.com/${owner}/${repo}.git`, depth: 1, revision: ref },
      resources: { vcpus: 2 },
      timeout: 5 * 60_000,
      networkPolicy: { allow: [...NPM_HOSTS, ...PY_HOSTS, ...GO_HOSTS, ...RUST_HOSTS, ...GIT_HOSTS] },
    });
    yield { t: "line", tone: "ok", text: `sandbox ready · 2 vCPU · ${owner}/${repo}@${ref}` };
    yield { t: "step", step: "boot", status: "pass" };

    const plan = await detect();
    if (!plan) {
      yield { t: "line", tone: "warn", text: "no package.json, pyproject.toml, requirements.txt, go.mod or Cargo.toml found (root or one folder down)" };
      yield { t: "done", build: "skip", test: "skip", failing: [] };
      return;
    }
    const where = plan.dir === ROOT ? "repo root" : plan.dir.slice(ROOT.length + 1);
    yield { t: "line", tone: "ok", text: `found a ${plan.lang} project in ${where}` };

    // The image may lack a toolchain (Go, Rust): say so instead of failing.
    const tool = plan.lang.startsWith("Go") ? "go" : plan.lang === "Rust" ? "cargo" : plan.lang === "Python" ? "python3" : "node";
    if (!(await read(`command -v ${tool} || true`))) {
      yield { t: "line", tone: "warn", text: `${tool} is not installed in the sandbox image, so the séance cannot run this ${plan.lang} project yet` };
      yield { t: "done", build: "skip", test: "skip", failing: [], lang: plan.lang };
      return;
    }

    let installCode = 0;
    if (plan.install) {
      yield { t: "step", step: "install", status: "run" };
      installCode = yield* exec(plan.install, plan.dir, STEP_MS.install);
      yield { t: "step", step: "install", status: installCode === 0 ? "pass" : "fail" };
    } else yield { t: "step", step: "install", status: "skip" };
    if (installCode !== 0) {
      yield { t: "line", tone: "bad", text: "install failed: the house will not open" };
      yield { t: "done", build: "skip", test: "skip", failing: ["install"], lang: plan.lang };
      return;
    }

    await sandbox.updateNetworkPolicy("deny-all");
    yield { t: "line", tone: "dim", text: "network closed" };

    let build: Status = "skip";
    if (plan.build) {
      yield { t: "step", step: "build", status: "run" };
      build = (yield* exec(plan.build, plan.dir, STEP_MS.build)) === 0 ? "pass" : "fail";
      yield { t: "step", step: "build", status: build };
    } else yield { t: "step", step: "build", status: "skip" };

    let test: Status = "skip";
    const failing: string[] = [];
    if (plan.test) {
      yield { t: "step", step: "test", status: "run" };
      const gen = exec(plan.test, plan.dir, STEP_MS.test);
      let r = await gen.next();
      while (!r.done) {
        const ev = r.value;
        // FAIL lines from Jest/Vitest, pytest, go test and cargo test become banshee evidence.
        if (ev.t === "line" && /^\s*(FAIL|FAILED|--- FAIL|✗|✖|×)\b|test .* \.\.\. FAILED/.test(ev.text)) failing.push(ev.text.trim());
        yield ev;
        r = await gen.next();
      }
      test = r.value === 0 ? "pass" : plan.noTests?.includes(r.value) ? "skip" : "fail";
      yield { t: "step", step: "test", status: test };
    } else yield { t: "step", step: "test", status: "skip" };

    if (build === "fail" || test === "fail") yield { t: "line", tone: "warn", text: "a banshee screams: the code fails when it runs" };
    else yield { t: "line", tone: "ok", text: "the spirits are calm" };
    yield { t: "done", build, test, failing: failing.slice(0, 20), lang: plan.lang };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Never log raw output; only the repo name.
    // The SDK error text is short and holds no repo output; it is redacted anyway before it leaves.
    const detail = redactLine(msg.replace(/\s+/g, " ").slice(0, 180));
    console.error("seance failed", { repo: `${owner}/${repo}`, detail });
    yield { t: "error", message: /auth|token|oidc|unauthor/i.test(msg) ? "The sandbox is not allowed on this deployment yet (Vercel Sandbox / OIDC)." : `The séance broke off: ${detail || "unknown error"}` };
  } finally {
    await sandbox?.stop().catch(() => undefined);
  }
}
