import { NextResponse, after } from "next/server";
import { parseRepo, redactLine } from "@haunted/core";
import { INSTALL_URL, canPush, getSession, userApi } from "@/lib/auth";
import { guard } from "@/lib/guard";
import { verifyPr } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const LOCK = /^([A-Za-z0-9._-]+\/)*(package-lock\.json|pnpm-lock\.yaml)$/;
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

/**
 * Opens one pull request that banishes vampires: new ranges or overrides in package.json and a
 * lockfile rewritten in a Vercel Sandbox. Only for logged-in owners with the app installed.
 */
export async function POST(req: Request) {
  const started = Date.now();
  const blocked = guard(req, { name: "vampire-pr", max: 4, windowMs: 600_000 });
  if (blocked) return blocked;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Log in with GitHub first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { repo?: string; lockfile?: string; upgrades?: unknown } | null;
  const ref = parseRepo(body?.repo ?? "");
  const lockfile = body?.lockfile ?? "";
  if (!ref || !LOCK.test(lockfile)) return NextResponse.json({ error: "Only npm and pnpm lockfiles can be fixed for now." }, { status: 400 });
  if (!(await canPush(s, ref.owner, ref.repo))) return NextResponse.json({ error: "You need push access to this repo." }, { status: 403 });

  const { fixVampires, validUpgrades } = await import("@/lib/vampire-fix");
  const ups = validUpgrades(body?.upgrades);
  if (ups.length === 0) return NextResponse.json({ error: "No safe upgrade to apply." }, { status: 400 });

  const base = `/repos/${ref.owner}/${ref.repo}`;
  const repo = await userApi<{ default_branch?: string }>(s.token, base);
  const head = repo.data.default_branch ?? "main";
  const tip = await userApi<{ object?: { sha?: string } }>(s.token, `${base}/git/ref/heads/${encodeURIComponent(head)}`);
  if (!tip.data.object?.sha) return NextResponse.json({ error: "Could not read the default branch." }, { status: 502 });

  let result;
  try {
    result = await fixVampires(ref.owner, ref.repo, head, lockfile, ups);
  } catch (e) {
    const msg = redactLine((e instanceof Error ? e.message : "").slice(0, 200));
    console.error("vampire fix failed", { repo: `${ref.owner}/${ref.repo}`, msg });
    return NextResponse.json({ error: `The sandbox could not update the lockfile: ${msg || "unknown error"}` }, { status: 502 });
  }

  const branch = `haunted-repo/vampires-${Math.random().toString(36).slice(2, 7)}`;
  const made = await userApi(s.token, `${base}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: tip.data.object.sha }) });
  if (!made.ok) {
    if (made.status === 403 || made.status === 404) return NextResponse.json({ error: "Install the Haunted Repo GitHub App on this repo first.", installUrl: INSTALL_URL }, { status: 403 });
    return NextResponse.json({ error: `GitHub answered ${made.status}.` }, { status: 502 });
  }
  for (const f of result.files) {
    const path = f.path.split("/").map(encodeURIComponent).join("/");
    const cur = await userApi<{ sha?: string }>(s.token, `${base}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    const put = await userApi(s.token, `${base}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({ message: `fix(deps): upgrade ${ups.length} vulnerable package${ups.length === 1 ? "" : "s"} (haunted-repo)`, content: b64(f.content), branch, ...(cur.data.sha ? { sha: cur.data.sha } : {}) }),
    });
    if (!put.ok) return NextResponse.json({ error: `Could not write ${f.path} (${put.status}).` }, { status: 502 });
  }

  const pr = await userApi<{ html_url?: string; number?: number }>(s.token, `${base}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: `🧛 Haunted Repo: banish ${ups.length} vampire${ups.length === 1 ? "" : "s"}`,
      head: branch,
      base: head,
      body: [
        `Smallest safe upgrades from OSV.dev advisories. The ${result.manager} lockfile was rewritten in a sealed sandbox (install scripts off), so it matches package.json.`,
        "",
        ...result.log.map((l) => `- \`${l}\``),
        "",
        "Run your tests before merging: a minor upgrade can still change behavior.",
      ].join("\n"),
    }),
  });
  if (!pr.data.html_url) return NextResponse.json({ error: `Branch ${branch} is pushed, but the pull request failed (${pr.status}).` }, { status: 502 });
  const num = pr.data.number;
  if (num) after(() => verifyPr(s.token, ref.owner, ref.repo, branch, num, 280_000 - (Date.now() - started)));
  return NextResponse.json({ url: pr.data.html_url, number: num, verifying: Boolean(num) });
}
