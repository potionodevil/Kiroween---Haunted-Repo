import type { Finding } from "@/lib/types";
import { KIND_LABEL } from "@/lib/sprites";
import { SeverityBadge } from "./SeverityBadge";
import { CopyButton } from "./CopyButton";

interface Props {
  finding: Finding | undefined;
  banished: boolean;
  onBanish: (f: Finding) => void;
}

export function DetailPanel({ finding: f, banished, onBanish }: Props) {
  if (!f) {
    return (
      <aside className="rounded-2xl border border-dust bg-crypt p-5 text-bone/70">
        Hover a creature to read its finding.
      </aside>
    );
  }
  const location = f.commit ? `${f.file}:${f.line} · ${f.commit}` : `${f.file}:${f.line}`;
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
        {location}
        {f.secretPreview && <div className="mt-1 text-bone/60">{f.secretPreview}</div>}
      </div>

      <h4 className="mt-5 text-sm font-semibold text-lantern">Suggested fix</h4>
      <p className="mt-1 text-sm text-bone/80">{f.fix}</p>

      {f.patch && !banished && (
        <details className="mt-3 rounded-lg bg-plum-night">
          <summary className="cursor-pointer px-3 py-2 text-xs text-bone/70">Show patch</summary>
          <pre className="overflow-x-auto px-3 pb-3 font-mono text-[11px] leading-relaxed text-bone/80">{f.patch}</pre>
        </details>
      )}

      <div className="mt-5 space-y-2">
        {banished ? (
          <p className="rounded-lg border border-zombie/40 bg-zombie/10 px-3 py-2.5 text-sm text-zombie">
            Laid to rest. {f.kind === "ghost" ? "Marked as exorcised." : "Copy the patch into your repo to make it stick."}
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
            <button
              type="button"
              disabled
              title="The ritual page comes next"
              className="w-full rounded-lg border border-dust px-4 py-2.5 text-bone/50"
            >
              Open the exorcism ritual
            </button>
          </>
        ) : f.autoFixable ? (
          <button
            type="button"
            onClick={() => onBanish(f)}
            className="w-full rounded-lg bg-lantern px-4 py-2.5 font-semibold text-plum-night hover:brightness-105"
          >
            Fix it now
          </button>
        ) : (
          <p className="text-sm text-bone/60">This one needs a human. Follow the fix above.</p>
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
