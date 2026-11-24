import { NextResponse } from "next/server";
import { parseRepo } from "@haunted/core";
import { INSTALL_URL, canPush, getSession, userApi } from "@/lib/auth";
import { guard } from "@/lib/guard";
import { insertBadge } from "@/lib/badge";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string) => Buffer.from(s, "base64").toString("utf8");

/** Opens a pull request that adds the Haunting score badge to the README. Never writes to the default branch. */
export async function POST(req: Request) {
  const blocked = guard(req, { name: "readme-badge", max: 5, windowMs: 600_000 });
  if (blocked) return blocked;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Log in with GitHub first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { repo?: string } | null;
  const ref = parseRepo(body?.repo ?? "");
  if (!ref) return NextResponse.json({ error: "That does not look like a GitHub repo" }, { status: 400 });
  if (!(await canPush(s, ref.owner, ref.repo))) return NextResponse.json({ error: "You need push access to this repo." }, { status: 403 });

  const origin = new URL(req.url).origin;
  const slug = `${ref.owner}/${ref.repo}`;
  const badge = `[![Haunting score](${origin}/api/badge?repo=${encodeURIComponent(slug)})](${origin}/house?repo=${encodeURIComponent(slug)})`;
  const base = `/repos/${ref.owner}/${ref.repo}`;

  const repo = await userApi<{ default_branch?: string }>(s.token, base);
  const head = repo.data.default_branch ?? "main";
  const readme = await userApi<{ path?: string; content?: string }>(s.token, `${base}/readme?ref=${encodeURIComponent(head)}`);
  const path = readme.ok && readme.data.path ? readme.data.path : "README.md";
  const current = readme.ok && readme.data.content ? unb64(readme.data.content) : `# ${ref.repo}\n`;
  if (current.includes("/api/badge?repo=")) return NextResponse.json({ error: "The README already has the badge." }, { status: 409 });

  const tip = await userApi<{ object?: { sha?: string } }>(s.token, `${base}/git/ref/heads/${encodeURIComponent(head)}`);
  if (!tip.data.object?.sha) return NextResponse.json({ error: "Could not read the default branch." }, { status: 502 });
  const branch = `haunted-repo/badge-${Math.random().toString(36).slice(2, 7)}`;
  const made = await userApi(s.token, `${base}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: tip.data.object.sha }) });
  if (!made.ok) {
    if (made.status === 403 || made.status === 404) return NextResponse.json({ error: "Install the Haunted Repo GitHub App on this repo first.", installUrl: INSTALL_URL }, { status: 403 });
    return NextResponse.json({ error: `GitHub answered ${made.status}.` }, { status: 502 });
  }
  const onBranch = await userApi<{ sha?: string }>(s.token, `${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`);
  const put = await userApi(s.token, `${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: JSON.stringify({ message: "docs: add Haunting score badge (haunted-repo)", content: b64(insertBadge(current, badge)), branch, ...(onBranch.data.sha ? { sha: onBranch.data.sha } : {}) }),
  });
  if (!put.ok) return NextResponse.json({ error: `Could not write ${path} (${put.status}).` }, { status: 502 });

  const pr = await userApi<{ html_url?: string; number?: number }>(s.token, `${base}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: "👻 Add the Haunting score badge",
      head: branch,
      base: head,
      body: "Adds the Haunted Repo badge to the README. It shows the current Haunting score (0 is a quiet house) and links to the scan.",
    }),
  });
  if (!pr.data.html_url) return NextResponse.json({ error: `Branch ${branch} is pushed, but the pull request failed (${pr.status}).` }, { status: 502 });
  return NextResponse.json({ url: pr.data.html_url, number: pr.data.number });
}
