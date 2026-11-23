import Link from "next/link";

/** Small ghost logo + wordmark used in app headers (design kit). */
export function GhostMark({ size = 24, sub }: { size?: number; sub?: string }) {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#F3ECDD" }}>
      <svg width={Math.round(size * 1.08)} height={Math.round(size * 1.2)} viewBox="0 0 34 38" aria-hidden="true">
        <path d="M17 2C8.7 2 3 8.3 3 16.5V35l4.7-3.5L12.3 35 17 31.5 21.7 35l4.6-3.5L31 35V16.5C31 8.3 25.3 2 17 2Z" fill="#F3ECDD" />
        <circle cx="12" cy="16" r="2.6" fill="#160E22" />
        <circle cx="22" cy="16" r="2.6" fill="#160E22" />
      </svg>
      <span className="font-display" style={{ fontSize: size }}>Haunted Repo</span>
      {sub && <span style={{ fontSize: 15, color: "#C2B6CF" }}>{sub}</span>}
    </Link>
  );
}
