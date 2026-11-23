import type { Finding, ScanResult, Severity } from "../types";
import { scoreLabel } from "../score";
import { CREATURE_KINDS } from "../types";

const SEV: Severity[] = ["critical", "warning", "low"];
const where = (f: Finding) => `${f.file}${f.line ? `:${f.line}` : ""}${f.commit ? ` (${f.commit})` : ""}`;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Feature 20: the autopsy report as Markdown. Masked values only; raw secrets never exist here. */
export function autopsyMarkdown(r: ScanResult, opts: { banished?: ReadonlySet<string>; generatedAt?: string } = {}): string {
  const open = r.findings.filter((f) => !opts.banished?.has(f.id));
  const lines: string[] = [];
  lines.push(`# Autopsy report: ${r.repo}`, "");
  lines.push(`Generated ${opts.generatedAt ?? new Date().toISOString()} by Haunted Repo.`, "");
  lines.push("## Summary", "");
  lines.push(`- Haunting score: **${r.score} / 100** (${scoreLabel(r.score)})`);
  lines.push(`- Open findings: ${open.length} of ${r.findings.length}`);
  lines.push(`- Scanned: ${r.commitsScanned} commits, ${r.filesScanned} files, branch \`${r.defaultBranch}\``);
  for (const s of SEV) lines.push(`- ${s[0]!.toUpperCase()}${s.slice(1)}: ${open.filter((f) => f.severity === s).length}`);
  if (r.partial) lines.push(`- Partial scan: ${r.notes.join(" ")}`);
  lines.push("");

  if (r.stack) {
    lines.push("## Stack", "");
    for (const [k, v] of Object.entries(r.stack)) if (v) lines.push(`- ${k}: ${v}`);
    lines.push("");
  }

  lines.push("## Findings by creature", "", "| Creature | Open |", "|---|---|");
  for (const k of CREATURE_KINDS) {
    const n = open.filter((f) => f.kind === k).length;
    if (n) lines.push(`| ${k} | ${n} |`);
  }
  lines.push("");

  for (const s of SEV) {
    const list = open.filter((f) => f.severity === s);
    if (!list.length) continue;
    lines.push(`## ${s[0]!.toUpperCase()}${s.slice(1)} (${list.length})`, "");
    lines.push("| Creature | Finding | Location | CWE | OWASP | Fix |", "|---|---|---|---|---|---|");
    for (const f of list) {
      lines.push(`| ${f.kind} | ${cell(f.title)} | \`${cell(where(f))}\` | ${f.cwe ?? ""} | ${f.owasp ?? ""} | ${cell(f.fix)} |`);
    }
    lines.push("");
  }

  const fixable = open.filter((f) => f.autoFixable && f.patch);
  if (fixable.length) {
    lines.push("## Fix list", "");
    for (const f of fixable) lines.push(`- [ ] ${f.title} in \`${where(f)}\``);
    lines.push("", "<details><summary>Combined patch</summary>", "", "```diff", ...fixable.map((f) => f.patch!.trimEnd()), "```", "", "</details>", "");
  }

  const dated = open.filter((f) => f.introducedAt).sort((a, b) => a.introducedAt!.localeCompare(b.introducedAt!));
  if (dated.length) {
    lines.push("## Timeline", "");
    for (const f of dated) lines.push(`- ${f.introducedAt!.slice(0, 10)}: ${f.title} (${f.commit ?? "HEAD"})`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Feature 21: CycloneDX 1.5 JSON SBOM from the resolved lockfile packages. */
export function cycloneDx(r: ScanResult, serial = "urn:uuid:00000000-0000-4000-8000-000000000000") {
  const vulnerable = new Map<string, Finding[]>();
  for (const f of r.findings.filter((x) => x.kind === "vampire" && x.dependencyPath?.length)) {
    const leaf = f.dependencyPath![f.dependencyPath!.length - 1]!;
    vulnerable.set(leaf, [...(vulnerable.get(leaf) ?? []), f]);
  }
  const purl = (p: { name: string; version: string; ecosystem: string }) =>
    p.ecosystem === "PyPI" ? `pkg:pypi/${p.name}@${p.version}` : `pkg:npm/${p.name.replace(/^@/, "%40")}@${p.version}`;
  const components = (r.packages ?? []).map((p) => ({ type: "library", "bom-ref": purl(p), name: p.name, version: p.version, purl: purl(p) }));
  const vulnerabilities = [...vulnerable.entries()].flatMap(([leaf, fs]) =>
    fs.map((f) => {
      const at = leaf.lastIndexOf("@");
      const p = { name: leaf.slice(0, at), version: leaf.slice(at + 1), ecosystem: "npm" };
      return { id: f.rule.replace(/^osv\//, ""), source: { name: "OSV", url: "https://osv.dev" }, ratings: [{ severity: f.severity === "critical" ? "critical" : f.severity === "warning" ? "high" : "medium" }], affects: [{ ref: purl(p) }] };
    }),
  );
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: serial,
    version: 1,
    metadata: { tools: [{ vendor: "Haunted Repo", name: "haunted-repo" }], component: { type: "application", name: r.repo } },
    components,
    vulnerabilities,
  };
}

/** Feature 19: shields-style SVG badge with the Haunting score. */
export function badgeSvg(score: number): string {
  const label = "haunting score";
  const value = `${score}/100`;
  const color = score === 0 ? "#3f9d5a" : score < 30 ? "#7fa83a" : score < 70 ? "#d49a22" : "#c8464a";
  const lw = 98;
  const vw = 54;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="20" role="img" aria-label="${label}: ${value}"><title>${label}: ${value}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${lw + vw}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#22172f"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${lw + vw}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="${lw / 2}" y="14">👻 ${label}</text><text x="${lw + vw / 2}" y="14">${value}</text></g></svg>`;
}
