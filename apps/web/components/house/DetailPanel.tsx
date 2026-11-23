import Link from "next/link";
import type { Finding } from "@haunted/core";
import { KIND_LABEL } from "@/lib/sprites";
import { SeverityBadge } from "./SeverityBadge";
import { CopyButton } from "./CopyButton";

interface Props {
  finding: Finding | undefined;
  banished: boolean;
  onBanish: (f: Finding) => void;
  ritualHref: string;
  /** Masked values only for the demo or a proven owner (security.md rule 8). */
  revealMasked: boolean;
}

export function DetailPanel({ finding: f, banished, onBanish, ritualHref, revealMasked }: Props) {
  if (!f) {
    return (
      <aside className="rounded-2xl border border-dust bg-crypt p-5 text-bone/70">
        Hover a creature to read its finding.
      </aside>
    );
  }
  const where = [f.line ? `${f.file}:${f.line}` : f.file, f.commit].filter(Boolean).join(" · ");
  return (
    <aside aria-live="polite" className="rounded-2xl border border-dust bg-crypt p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SeverityBadge severity={f.severity} fixed={banished} />
        <span className="rounded-md border border-dust px-2 py-0.5 text-bone/80">
          {KIND_LABEL[f.kind].one} · {KIND_LABEL[f.kind].meaning}
        </span>
        <span className="font-mono text-bone/55">{f.rule}</span>
      </div>

      <h3 className="mt-3 text-xl font-bold">{f.title}</h3>
      <p className="mt-1.5 text-sm text-bone/75">{f.message}</p>

      <div className="mt-4 rounded-lg bg-plum-night px-3 py-2 font-mono text-xs text-bone/80">
        {where}
        {f.kind === "ghost" && (
          <div className="mt-1 text-bone/60">
            {revealMasked && f.masked ? f.masked : "Value hidden until you prove you own this repo"}
          </div>
        )}
        {f.dependencyPath && <div className="mt-1 text-bone/60">{f.dependencyPath.join(" → ")}</div>}
      </div>

      {(f.cwe || f.owasp || f.confidence) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-bone/70">
          {f.cwe && <span className="rounded border border-dust px-1.5 py-0.5 font-mono">{f.cwe}</span>}
          {f.owasp && <span className="rounded border border-dust px-1.5 py-0.5 font-mono">OWASP {f.owasp}</span>}
          {f.confidence && <span className="rounded border border-dust px-1.5 py-0.5">Confidence: {f.confidence}</span>}
        </div>
      )}

      {f.blastRadius && (
        <>
          <h4 className="mt-5 text-sm font-semibold">If someone abuses it</h4>
          <p className="mt-1 text-sm text-bone/80">{f.blastRadius}</p>
        </>
      )}

      <h4 className="mt-5 text-sm font-semibold text-lantern">Suggested fix</h4>
      <p className="mt-1 text-sm text-bone/80">
        {f.fix}
        {f.minimalUpgrade && <span className="font-mono"> ({f.minimalUpgrade})</span>}
      </p>

      {f.patch && !banished && (
        <details className="mt-3 rounded-lg bg-plum-night">
          <summary className="cursor-pointer px-3 py-2 text-xs text-bone/70">Show patch</summary>
          <pre className="overflow-x-auto px-3 pb-3 font-mono text-[11px] leading-relaxed text-bone/80">{f.patch}</pre>
        </details>
      )}

      {f.references && f.references.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {f.references.slice(0, 3).map((r) => (
            <li key={r}>
              <a href={r} target="_blank" rel="noreferrer" className="break-all text-bone/70 underline underline-offset-2 hover:text-bone">
                {r}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 space-y-2">
        {banished ? (
          <p className="rounded-lg border border-zombie/40 bg-zombie/10 px-3 py-2.5 text-sm text-zombie">
            Laid to rest. {f.kind === "ghost" ? "Marked as exorcised." : f.patch ? "Copy the patch into your repo to make it stick." : ""}
          </p>
        ) : f.kind === "ghost" ? (
          <>
            <button
              type="button"
              onClick={() => onBanish(f)}
              className="w-full rounded-lg bg-lantern px-4 py-2.5 font-semibold text-plum-night hover:brightness-105"
            >
              Mark as exorcised
            </button>
            <Link
              href={ritualHref}
              className="block w-full rounded-lg border border-dust px-4 py-2.5 text-center hover:border-bone/50"
            >
              Open the exorcism ritual
            </Link>
          </>
        ) : f.autoFixable && f.patch ? (
          <button
            type="button"
            onClick={() => onBanish(f)}
            className="w-full rounded-lg bg-lantern px-4 py-2.5 font-semibold text-plum-night hover:brightness-105"
          >
            Fix it now
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBanish(f)}
            className="w-full rounded-lg border border-dust px-4 py-2.5 hover:border-bone/50"
          >
            I fixed it by hand
          </button>
        )}
        {banished && f.patch && (
          <div className="flex justify-end">
            <CopyButton text={f.patch} label="Copy patch" />
          </div>
        )}
      </div>
    </aside>
  );
}
