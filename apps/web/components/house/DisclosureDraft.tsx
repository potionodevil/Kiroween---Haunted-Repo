"use client";
import { useState } from "react";
import type { Finding } from "@haunted/core";
import { CopyButton } from "./CopyButton";

/**
 * Feature 22: for repos the user has not proven to own, draft a private report to the maintainer.
 * Names the key type and location only, never the value.
 */
export function DisclosureDraft({ finding: f, repo }: { finding: Finding; repo: string }) {
  const [open, setOpen] = useState(false);
  const text = `Hello,

while checking ${repo} with Haunted Repo I found what looks like a leaked credential.

Type: ${f.title} (${f.rule})
Location: ${f.file}${f.line ? `:${f.line}` : ""}${f.commit ? `, commit ${f.commit}` : ""}
${f.ghost?.commitCount ? `Still readable in ${f.ghost.commitCount} commit(s) of the git history.\n` : ""}
I did not use or test the credential. Please rotate it at the provider and remove it from history (git filter-repo --replace-text).

Thank you for maintaining the project.`;
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ background: "none", border: 0, padding: 0, color: "#C2B6CF", fontSize: 14, cursor: "pointer", textDecoration: "underline" }}>
        Not your repo? Report it privately
      </button>
      {open && (
        <div style={{ marginTop: 10, borderRadius: 12, border: "1px solid #45345E", padding: 12 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5, color: "#C2B6CF" }}>{text}</pre>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <CopyButton text={text} label="Copy report" />
            <a href={`https://github.com/${repo}/security/advisories/new`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#F2B544" }}>
              Open a private advisory
            </a>
            <a href={`https://github.com/${repo}/blob/HEAD/SECURITY.md`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#C2B6CF" }}>
              SECURITY.md
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
