import { NextResponse, after } from "next/server";
import { applyPatchText, parsePatches, parseRepo } from "@haunted/core";
import { INSTALL_URL, canPush, getSession, userApi } from "@/lib/auth";
import { guard } from "@/lib/guard";
import { verifyPr } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface FixIn {
  rule: string;
  title: string;
  patch: string;
}

const MAX_FIXES = 40;
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string) => Buffer.from(s, "base64").toString("utf8");

/**
 * Opens one pull request with the auto-fixes (never pushes to the default branch).
 * Uses the visitor's own GitHub App user token, so it only works on repos where the app is installed
 * and the visitor has push access. Ghosts are never auto-fixed (product.md).
 */
export async function POST(req: Request) {
  const started = Date.now();
  const blocked = guard(req, { name: "fix-pr", max: 10, windowMs: 600000 });
  if (blocked) return blocked;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Log in with GitHub first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { repo?: string; fixes?: FixIn[]; mark?: boolean } | null;
  const ref = parseRepo(body?.repo ?? "");
  const fixes = (body?.fixes ?? []).filter((f) => f && typeof f.patch === "string" && !String(f.rule).startsWith("secret/")).slice(0, MAX_FIXES);
  if (!ref || fixes.length === 0) return NextResponse.json({ error: "Nothing to fix." }, { status: 400 });
  if (!(await canPush(s, ref.owner, ref.repo))) {
    return NextResponse.json({ error: "You need push access to this repo." }, { status: 403 });
  }

  const base = `/repos/${ref.owner}/${ref.repo}`;
  const repo = await userApi<{ default_branch?: string }>(s.token, base);
  const head = repo.data.default_branch ?? "main";
  const tip = await userApi<{ object?: { sha?: string } }>(s.token, `${base}/git/ref/heads/${encodeURIComponent(head)}`);
  if (!tip.data.object?.sha) return NextResponse.json({ error: "Could not read the default branch." }, { status: 502 });

  const branch = `haunted-repo/exorcism-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}`;
  const made = await userApi(s.token, `${base}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: tip.data.object.sha }) });
  if (!made.ok) {
    if (made.status === 403 || made.status === 404) {
      return NextResponse.json({ error: "Install the Haunted Repo GitHub App on this repo first.", installUrl: INSTALL_URL }, { status: 403 });
    }
    return NextResponse.json({ error: `GitHub answered ${made.status}.` }, { status: 502 });
  }

  // Group patches per file, so each file gets one commit.
  const byFile = new Map<string, FixIn[]>();
  for (const f of fixes) for (const p of parsePatches(f.patch)) byFile.set(p.file, [...(byFile.get(p.file) ?? []), f]);

  const applied: { file: string; rules: string[] }[] = [];
  const skipped: string[] = [];
  for (const [file, list] of byFile) {
    const path = file.split("/").map(encodeURIComponent).join("/");
    const cur = await userApi<{ content?: string; sha?: string }>(s.token, `${base}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    let text: string | null = cur.ok && cur.data.content ? unb64(cur.data.content) : cur.status === 404 ? "" : null;
    for (const f of list) if (text !== null) text = applyPatchText(text, f.patch, file, body?.mark === false ? undefined : f.rule);
    if (text === null) {
      skipped.push(file);
      continue;
    }
    const put = await userApi(s.token, `${base}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({ message: `fix: ${list.map((f) => f.rule).join(", ")} (haunted-repo)`, content: b64(text), branch, ...(cur.data.sha ? { sha: cur.data.sha } : {}) }),
    });
    if (put.ok) applied.push({ file, rules: list.map((f) => f.rule) });
    else skipped.push(file);
  }

  if (applied.length === 0) {
    await userApi(s.token, `${base}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "DELETE" });
    return NextResponse.json({ error: "No patch fit the current code. Rescan and try again.", skipped }, { status: 409 });
  }

  const lines = applied.map((a) => `- \`${a.file}\`: ${a.rules.map((r) => `\`${r}\``).join(", ")}`);
  const pr = await userApi<{ html_url?: string; number?: number }>(s.token, `${base}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: `👻 Haunted Repo: lay ${applied.length} file${applied.length === 1 ? "" : "s"} to rest`,
      head: branch,
      base: head,
      body: [
        "Auto-fixes from a Haunted Repo scan. Every changed spot carries a `haunted-repo:` comment so you can see what moved.",
        "",
        ...lines,
        ...(skipped.length ? ["", `Skipped (code changed since the scan): ${skipped.map((f) => `\`${f}\``).join(", ")}`] : []),
        "",
        "Secrets are never auto-fixed. Use the exorcism ritual for those.",
      ].join("\n"),
    }),
  });
  if (!pr.data.html_url) return NextResponse.json({ error: `Branch ${branch} is pushed, but the pull request failed (${pr.status}).` }, { status: 502 });
  // Test the fix before anyone merges it: a séance on the branch posts its result on the PR.
  const num = pr.data.number;
  if (num) after(() => verifyPr(s.token, ref.owner, ref.repo, branch, num, 270_000 - (Date.now() - started)));
  return NextResponse.json({ url: pr.data.html_url, number: num, applied, skipped, verifying: Boolean(num) });
}
