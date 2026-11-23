"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CREATURE_KINDS, autopsyMarkdown, cycloneDx, scoreLabel, score as calcScore, type Finding, type Severity } from "@haunted/core";
import type { GateContext } from "@/components/ScanGate";
import { useBanished } from "@/lib/client/useBanished";
import { scanQuery } from "@/lib/client/session";
import { KIND_LABEL, SEVERITY_LABEL } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import { location } from "@/components/house/CreatureCard";
import { CopyButton } from "@/components/house/CopyButton";

const SEV: Severity[] = ["critical", "warning", "low"];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Feature 20 autopsy report (print-ready page + Markdown), 21 SBOM, 19 badge. */
export function Report({ ctx }: { ctx: GateContext }) {
  const { result, demo } = ctx;
  const { banished } = useBanished(result.repo);
  const q = scanQuery(result.repo, demo);
  const open = useMemo(() => result.findings.filter((f) => !banished.has(f.id)), [result.findings, banished]);
  const liveScore = calcScore(result.findings, banished);
  const slug = result.repo.replace("/", "-");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const badgeUrl = `${origin}/api/badge?${demo ? "demo=1" : `repo=${encodeURIComponent(result.repo)}`}`;
  const badgeMd = `[![Haunting score](${badgeUrl})](${origin}/house?${q})`;

  const th = { textAlign: "left" as const, padding: "8px 10px", borderBottom: "1px solid #45345E", fontSize: 13, color: "#C2B6CF" };
  const td = { padding: "8px 10px", borderBottom: "1px solid #33244A", fontSize: 14, verticalAlign: "top" as const };

  return (
    <div className="report" style={{ minHeight: "100vh", background: "#160E22", color: "#F3ECDD" }}>
      <header className="no-print" style={{ borderBottom: "1px solid #33244A" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 32px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <Link href={`/house?${q}&cached=1`} style={{ color: "#C2B6CF", textDecoration: "none" }}>‹ Back to the haunted house</Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" onClick={() => window.print()} style={{ height: 44, padding: "0 16px", borderRadius: 10, border: 0, background: "#F2B544", color: "#241604", fontWeight: 700, cursor: "pointer" }}>
              Export autopsy report (PDF)
            </button>
            <button type="button" onClick={() => download(`autopsy-${slug}.md`, autopsyMarkdown({ ...result, score: liveScore }, { banished }), "text/markdown")} style={{ height: 44, padding: "0 16px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: "#F3ECDD", cursor: "pointer" }}>
              Download Markdown
            </button>
            <button type="button" disabled={!result.packages?.length} onClick={() => download(`sbom-${slug}.cdx.json`, JSON.stringify(cycloneDx(result, `urn:uuid:${crypto.randomUUID()}`), null, 2), "application/json")} title={result.packages?.length ? "" : "No lockfile packages in this scan"} style={{ height: 44, padding: "0 16px", borderRadius: 10, border: "1px solid #45345E", background: "transparent", color: result.packages?.length ? "#F3ECDD" : "#6E6182", cursor: "pointer" }}>
              Export SBOM (CycloneDX)
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Sprite kind="skeleton" scale={0.6} paused />
          <div>
            <h1 className="font-display" style={{ margin: 0, fontSize: 52, lineHeight: 1 }}>Autopsy report</h1>
            <div className="font-mono" style={{ color: "#C2B6CF", marginTop: 6 }}>
              {result.repo} · {result.defaultBranch} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {[
            ["Haunting score", `${liveScore} / 100`, scoreLabel(liveScore)],
            ["Open findings", `${open.length}`, `of ${result.findings.length}`],
            ...SEV.map((s) => [SEVERITY_LABEL[s], `${open.filter((f) => f.severity === s).length}`, "open"]),
            ["Scanned", `${result.commitsScanned}`, `commits · ${result.filesScanned} files`],
          ].map(([a, b, c]) => (
            <div key={a} style={{ background: "#22172F", border: "1px solid #33244A", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#C2B6CF" }}>{a}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{b}</div>
              <div style={{ fontSize: 12, color: "#9C8FAE" }}>{c}</div>
            </div>
          ))}
        </section>
        {result.notes.length > 0 && <p style={{ marginTop: 12, fontSize: 13, color: "#9C8FAE" }}>{result.notes.join(" ")}</p>}

        {result.stack && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 22 }}>Stack card</h2>
            <dl style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              {Object.entries(result.stack).map(([k, v]) => (
                <div key={k} style={{ background: "#22172F", border: "1px solid #33244A", borderRadius: 12, padding: 12 }}>
                  <dt style={{ fontSize: 12, color: "#9C8FAE", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd style={{ margin: 0, fontWeight: 700 }}>{v ?? "not detected"}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>Creatures</h2>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CREATURE_KINDS.filter((k) => result.findings.some((f) => f.kind === k)).map((k) => (
              <span key={k} style={{ border: "1px solid #45345E", borderRadius: 20, padding: "6px 12px", fontSize: 14 }}>
                {KIND_LABEL[k].many}: {open.filter((f) => f.kind === k).length}
              </span>
            ))}
          </div>
        </section>

        {SEV.map((s) => {
          const list: Finding[] = open.filter((f) => f.severity === s);
          if (!list.length) return null;
          return (
            <section key={s} style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 22 }}>
                {SEVERITY_LABEL[s]} ({list.length})
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={th}>Creature</th>
                      <th style={th}>Finding</th>
                      <th style={th}>Location</th>
                      <th style={th}>CWE / OWASP</th>
                      <th style={th}>Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((f) => (
                      <tr key={f.id}>
                        <td style={td}>{KIND_LABEL[f.kind].one}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{f.title}</td>
                        <td style={td} className="font-mono">{location(f)}</td>
                        <td style={td} className="font-mono">{[f.cwe, f.owasp].filter(Boolean).join(" · ") || "–"}</td>
                        <td style={{ ...td, color: "#C2B6CF" }}>{f.fix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <section className="no-print" style={{ marginTop: 36, background: "#22172F", border: "1px solid #33244A", borderRadius: 16, padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>README badge</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeUrl} alt={`Haunting score ${liveScore} of 100`} style={{ marginTop: 12, height: 20 }} />
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <code className="font-mono" style={{ flex: 1, minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", fontSize: 12, background: "#160E22", padding: 10, borderRadius: 8 }}>
              {badgeMd}
            </code>
            <CopyButton text={badgeMd} />
          </div>
        </section>
      </main>
    </div>
  );
}
