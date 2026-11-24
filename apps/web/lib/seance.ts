import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { redactLine } from "@haunted/core";

/**
 * Live séance (feature 26): clone, install, build and test a repo in a Vercel Sandbox.
 * security.md rule 10: no env vars, tokens or keys go in; network is limited to registries during
 * install and closed afterwards; the sandbox is always stopped. Rule 11: install uses --ignore-scripts.
 */
export type Tone = "ok" | "bad" | "warn" | "dim" | "cmd";
export type SeanceEvent =
  | { t: "line"; tone: Tone; text: string }
  | { t: "step"; step: Step; status: "run" | "pass" | "fail" | "skip" }
  | { t: "done"; build: Status; test: Status; failing: string[] }
  | { t: "error"; message: string };
export type Step = "boot" | "install" | "build" | "test";
type Status = "pass" | "fail" | "skip";

const REGISTRIES = ["registry.npmjs.org", "*.npmjs.org", "registry.yarnpkg.com", "*.yarnpkg.com", "github.com", "codeload.github.com", "objects.githubusercontent.com"];
const MAX_LINES = 600;
const STEP_MS = { install: 150_000, build: 90_000, test: 90_000 };

function toneOf(text: string): Tone {
  if (/\b(FAIL|failed|Error|ERR!|✗|✖)\b/i.test(text)) return "bad";
  if (/\b(PASS|passed|✓|✔|Done|success)\b/i.test(text)) return "ok";
  if (/\bwarn/i.test(text)) return "warn";
  return "dim";
}

export async function* runSeance(owner: string, repo: string, ref: string): AsyncGenerator<SeanceEvent> {
  let sandbox: Sandbox | null = null;
  let sent = 0;
  const line = (text: string, tone?: Tone): SeanceEvent | null => {
    if (sent >= MAX_LINES) return null;
    sent++;
    const clean = redactLine(text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").slice(0, 400));
    return { t: "line", tone: tone ?? toneOf(clean), text: clean };
  };

  async function* exec(cmd: string, args: string[], timeoutMs: number): AsyncGenerator<SeanceEvent, number> {
    const l = line(`$ ${cmd} ${args.join(" ")}`, "cmd");
    if (l) yield l;
    const c = await sandbox!.runCommand({ cmd, args, detached: true, env: { CI: "1", FORCE_COLOR: "0" }, timeoutMs });
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

  try {
    yield { t: "step", step: "boot", status: "run" };
    sandbox = await Sandbox.create({
      source: { type: "git", url: `https://github.com/${owner}/${repo}.git`, depth: 1, revision: ref },
      image: "vercel/sandbox/node:22",
      resources: { vcpus: 2 },
      timeout: 5 * 60_000,
      networkPolicy: { allow: REGISTRIES },
    });
    yield { t: "line", tone: "ok", text: `sandbox ready · node 22 · 2 vCPU · ${owner}/${repo}@${ref}` };
    yield { t: "step", step: "boot", status: "pass" };

    const pkgRaw = await (await sandbox.runCommand("cat", ["package.json"])).stdout().catch(() => "");
    let scripts: Record<string, string> = {};
    try {
      scripts = (JSON.parse(pkgRaw) as { scripts?: Record<string, string> }).scripts ?? {};
    } catch {
      yield { t: "line", tone: "warn", text: "no package.json at the repo root: the séance only speaks JavaScript for now" };
      yield { t: "done", build: "skip", test: "skip", failing: [] };
      return;
    }
    const ls = await (await sandbox.runCommand("ls", ["-a"])).stdout().catch(() => "");
    const pm = ls.includes("pnpm-lock.yaml") ? "pnpm" : ls.includes("yarn.lock") ? "yarn" : "npm";
    const run = (s: string): [string, string[]] => (pm === "npm" ? ["npm", ["run", s]] : ["npx", ["--yes", pm === "pnpm" ? "pnpm@9" : "yarn@1", "run", s]]);

    yield { t: "step", step: "install", status: "run" };
    const install: [string, string[]] =
      pm === "pnpm" ? ["npx", ["--yes", "pnpm@9", "install", "--ignore-scripts", "--no-frozen-lockfile"]]
      : pm === "yarn" ? ["npx", ["--yes", "yarn@1", "install", "--ignore-scripts"]]
      : ["npm", [ls.includes("package-lock.json") ? "ci" : "install", "--ignore-scripts", "--no-audit", "--no-fund"]];
    const installCode = yield* exec(install[0], install[1], STEP_MS.install);
    yield { t: "step", step: "install", status: installCode === 0 ? "pass" : "fail" };
    if (installCode !== 0) {
      yield { t: "line", tone: "bad", text: "install failed: the house will not open" };
      yield { t: "done", build: "skip", test: "skip", failing: ["install"] };
      return;
    }

    await sandbox.updateNetworkPolicy("deny-all");
    yield { t: "line", tone: "dim", text: "network closed" };

    let build: Status = "skip";
    if (scripts.build) {
      yield { t: "step", step: "build", status: "run" };
      const [c, a] = run("build");
      build = (yield* exec(c, a, STEP_MS.build)) === 0 ? "pass" : "fail";
      yield { t: "step", step: "build", status: build };
    } else yield { t: "step", step: "build", status: "skip" };

    let test: Status = "skip";
    const failing: string[] = [];
    if (scripts.test && !/no test specified/.test(scripts.test)) {
      yield { t: "step", step: "test", status: "run" };
      const [c, a] = run("test");
      const lines: string[] = [];
      // Collect FAIL lines for banshee findings while streaming.
      const gen = exec(c, a, STEP_MS.test);
      let r = await gen.next();
      while (!r.done) {
        const ev = r.value;
        if (ev.t === "line" && /^\s*(FAIL|✗|✖|×)\s+\S/.test(ev.text)) lines.push(ev.text.trim());
        yield ev;
        r = await gen.next();
      }
      test = r.value === 0 ? "pass" : "fail";
      failing.push(...lines.slice(0, 20));
      yield { t: "step", step: "test", status: test };
    } else yield { t: "step", step: "test", status: "skip" };

    if (build === "fail" || test === "fail") yield { t: "line", tone: "warn", text: "a banshee screams: the code fails when it runs" };
    else yield { t: "line", tone: "ok", text: "the spirits are calm" };
    yield { t: "done", build, test, failing };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Never log raw output; the message is a short SDK error.
    console.error("seance failed", { repo: `${owner}/${repo}` });
    yield { t: "error", message: /auth|token|oidc|unauthor/i.test(msg) ? "The sandbox is not allowed on this deployment yet (Vercel Sandbox / OIDC)." : "The séance broke off. Try again." };
  } finally {
    await sandbox?.stop().catch(() => undefined);
  }
}
