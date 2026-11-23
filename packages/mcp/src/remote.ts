import {
  HEAD,
  OSV_CHUNK,
  buildOsvQueries,
  collectGhosts,
  mapVampires,
  scanPatch,
  scanText,
  score,
  sortFindings,
  type OsvBatchResult,
  type OsvVuln,
  type RepoRef,
  type ScanResult,
  type SecretHit,
} from "@haunted/core";
import { scanLocalFiles } from "@haunted/core/code";
import { fetchCommitShas, fetchDiffs, fetchFiles, fetchRepo, fetchTree } from "@haunted/github";

/** GitHub scan for the MCP server and CLI: same scanners as the web app, 100 commits to stay quick inside an editor. */
export async function scanGitHubRepo({ owner, repo }: RepoRef, maxCommits = 100): Promise<ScanResult> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  try {
    const info = await fetchRepo(owner, repo, ctrl.signal);
    const branch = info.defaultBranch;
    const [shas, tree] = await Promise.all([fetchCommitShas(owner, repo, branch, ctrl.signal), fetchTree(owner, repo, branch, ctrl.signal)]);
    const take = shas.slice(0, maxCommits);
    const entries = [...new Map([...tree.code, ...tree.secretFiles, ...tree.meta, ...tree.workflows, ...tree.lockfiles].map((e) => [e.path, e])).values()];
    const [diffs, files] = await Promise.all([fetchDiffs(owner, repo, take, ctrl.signal), fetchFiles(owner, repo, branch, entries, ctrl.signal)]);

    const history: SecretHit[] = diffs.flatMap((d) => d.files.flatMap((f) => (f.patch ? scanPatch(f.patch, { file: f.filename, commit: d.sha.slice(0, 7), date: d.date }) : [])));
    const head: SecretHit[] = files.flatMap((f) => scanText(f.content, { file: f.path, commit: HEAD, date: null }));
    const local = scanLocalFiles(files, { paths: tree.paths, repo: `${owner}/${repo}` });
    const nonGhosts = local.result.findings.filter((f) => f.kind !== "ghost");

    let vampires: ScanResult["findings"] = [];
    try {
      const results: OsvBatchResult["results"] = [];
      for (let i = 0; i < local.packages.length; i += OSV_CHUNK) {
        const res = await fetch("https://api.osv.dev/v1/querybatch", { method: "POST", body: JSON.stringify({ queries: buildOsvQueries(local.packages.slice(i, i + OSV_CHUNK)) }), signal: ctrl.signal });
        results.push(...(((await res.json()) as OsvBatchResult).results ?? []));
      }
      const ids = [...new Set(results.flatMap((r) => r.vulns?.map((v) => v.id) ?? []))].slice(0, 200);
      const details = new Map<string, OsvVuln>();
      await Promise.all(ids.map(async (id) => {
        const r = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, { signal: ctrl.signal });
        if (r.ok) details.set(id, (await r.json()) as OsvVuln);
      }));
      vampires = mapVampires(local.packages, { results }, details);
    } catch {
      local.result.notes.push("OSV.dev did not answer: vulnerable dependencies were skipped.");
    }

    const findings = sortFindings([...collectGhosts(history, head), ...vampires, ...nonGhosts]);
    return {
      ...local.result,
      repo: `${owner}/${repo}`,
      defaultBranch: branch,
      commitsScanned: diffs.length,
      filesScanned: files.length,
      durationMs: Date.now() - started,
      partial: ctrl.signal.aborted,
      findings,
      score: score(findings),
    };
  } finally {
    clearTimeout(timer);
  }
}
