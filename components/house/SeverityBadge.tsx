import type { Severity } from "@/lib/types";
import { SEVERITY_LABEL } from "@/lib/sprites";

const STYLE: Record<Severity | "fixed", string> = {
  critical: "bg-lantern text-plum-night",
  warning: "bg-dust text-bone",
  low: "bg-dust/60 text-bone/90",
  fixed: "bg-zombie/20 text-zombie",
};

export function SeverityBadge({ severity, fixed = false }: { severity: Severity; fixed?: boolean }) {
  const key = fixed ? "fixed" : severity;
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${STYLE[key]}`}>
      {fixed ? "Fixed" : SEVERITY_LABEL[severity]}
    </span>
  );
}
