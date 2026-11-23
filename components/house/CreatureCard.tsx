import type { Finding } from "@/lib/types";
import { KIND_LABEL, SEVERITY_LABEL, SEVERITY_SCALE } from "@/lib/sprites";
import { Sprite } from "@/components/Sprite";
import { SeverityBadge } from "./SeverityBadge";

interface Props {
  finding: Finding;
  banished: boolean;
  pinned: boolean;
  onHover: (id: string | null) => void;
  onPin: (id: string) => void;
}

export function accessibleName(f: Finding, banished: boolean): string {
  const where = f.commit ? `${f.file}, commit ${f.commit}` : `${f.file}, line ${f.line}`;
  const state = banished ? " (banished)" : "";
  return `${SEVERITY_LABEL[f.severity]} ${KIND_LABEL[f.kind].one.toLowerCase()}: ${f.title} in ${where}${state}`;
}

export function CreatureCard({ finding: f, banished, pinned, onHover, onPin }: Props) {
  const critical = f.severity === "critical" && !banished;
  return (
    <button
      type="button"
      aria-label={accessibleName(f, banished)}
      aria-pressed={pinned}
      onMouseEnter={() => onHover(f.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(f.id)}
      onBlur={() => onHover(null)}
      onClick={() => onPin(f.id)}
      className={[
        "group flex min-h-52 flex-col rounded-2xl border p-4 text-left transition",
        critical ? "border-lantern/70 bg-lantern/12" : "border-dust bg-crypt",
        pinned ? "ring-2 ring-lantern" : "hover:border-bone/40",
      ].join(" ")}
    >
      <span className={`flex h-28 items-center justify-center transition ${banished ? "opacity-35 grayscale" : ""}`}>
        <Sprite kind={f.kind} scale={0.75 * SEVERITY_SCALE[f.severity]} paused={banished} />
      </span>
      <span className={`mt-auto ${banished ? "opacity-50" : ""}`}>
        <span className="block font-semibold">{f.title}</span>
        <span className="mt-0.5 block truncate font-mono text-xs text-bone/60">
          {f.commit ? `${f.file} · ${f.commit}` : `${f.file}:${f.line}`}
        </span>
      </span>
      <span className="mt-3">
        <SeverityBadge severity={f.severity} fixed={banished} />
      </span>
    </button>
  );
}
