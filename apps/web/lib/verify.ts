import "server-only";
import { userApi } from "./auth";
import type { SeanceEvent } from "./seance";

/**
 * Tests a fix branch before anyone merges it: a séance (install, build, test in a Vercel Sandbox)
 * runs on the PR branch, and the result lands as a comment on the pull request.
 * Runs after the response (next/server after()), inside the route's time budget.
 * Output lines are already redacted by the séance; only the last failing lines are posted.
 */
const MARK: Record<string, string> = { pass: "✅ pass", fail: "❌ fail", skip: "➖ skipped" };

export async function verifyPr(token: string, owner: string, repo: string, branch: string, pr: number, budgetMs: number): Promise<void> {
  const { runSeance } = await import("./seance");
  const gen = runSeance(owner, repo, branch);
  const stopAt = Date.now() + budgetMs;
  let done: Extract<SeanceEvent, { t: "done" }> | null = null;
  let error: string | null = null;
  let timedOut = false;
  const bad: string[] = [];
  try {
    for (;;) {
      const left = stopAt - Date.now();
      const next = left > 0 ? await Promise.race([gen.next(), new Promise<"late">((r) => setTimeout(() => r("late"), left))]) : "late";
      if (next === "late") {
        timedOut = true;
        break;
      }
      if (next.done) break;
      const ev = next.value;
      if (ev.t === "line" && ev.tone === "bad") bad.push(ev.text);
      else if (ev.t === "done") done = ev;
      else if (ev.t === "error") error = ev.message;
    }
  } catch (e) {
    error = e instanceof Error ? "The séance broke off." : "unknown error";
  } finally {
    // Stops the sandbox (the séance's finally block) when we leave early.
    await gen.return(undefined).catch(() => undefined);
  }

  const failing = (done?.failing.length ? done.failing : bad).slice(-12);
  const body = [
    "### 🕯️ Séance on this branch",
    "Haunted Repo installed, built and tested this fix in a sealed Vercel Sandbox (install scripts off, network closed after install).",
    "",
    ...(done
      ? [`${done.lang ? `${done.lang} · ` : ""}build ${MARK[done.build]} · tests ${MARK[done.test]}`, ...(done.failing.length === 0 && done.build !== "fail" && done.test !== "fail" ? ["", "The spirits are calm: nothing broke."] : [])]
      : [timedOut ? "⏳ The séance ran out of time before the tests finished. Run your tests before merging." : `⚠️ ${error ?? "The séance did not finish."}`]),
    ...(failing.length && (done?.build === "fail" || done?.test === "fail" || !done) ? ["", "```", ...failing, "```"] : []),
  ].join("\n");
  await userApi(token, `/repos/${owner}/${repo}/issues/${pr}/comments`, { method: "POST", body: JSON.stringify({ body }) }).catch(() => undefined);
}
