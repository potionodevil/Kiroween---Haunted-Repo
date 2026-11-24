"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CreatureKind } from "@haunted/core";
import { Sprite } from "@/components/Sprite";

/**
 * Side navigation for every page after the landing: house, hunt, séance, report, new scan, rescan.
 * Keeps the repo in the links and always uses the scan cached in this tab (no reload).
 * Wide screens: a rail on the left. Small screens: a bar at the bottom.
 */
const ITEMS: { path: string; label: string; kind: CreatureKind }[] = [
  { path: "/house", label: "House", kind: "ghost" },
  { path: "/hunt", label: "Hunt", kind: "bat" },
  { path: "/seance", label: "Séance", kind: "banshee" },
  { path: "/report", label: "Report", kind: "skeleton" },
];

export function SideNav() {
  const path = usePathname();
  const params = useSearchParams();
  if (path === "/") return null;
  const repo = params.get("repo");
  const demo = params.get("demo") === "1" || !repo;
  const q = demo ? "demo=1" : `repo=${encodeURIComponent(repo!)}`;

  return (
    <nav aria-label="Haunted Repo" className="sidenav">
      <Link href="/" className="sn-item sn-home" aria-label="Home: scan another repo">
        <span className="sn-icon font-display">H</span>
        <span className="sn-label">Home</span>
      </Link>
      {ITEMS.map((it) => {
        const on = path === it.path || (it.path === "/house" && path.startsWith("/exorcism"));
        return (
          <Link key={it.path} href={`${it.path}?${q}&cached=1`} className={`sn-item${on ? " sn-on" : ""}`} aria-current={on ? "page" : undefined}>
            <span className="sn-icon" aria-hidden="true">
              <Sprite kind={it.kind} scale={0.32} paused={!on} />
            </span>
            <span className="sn-label">{it.label}</span>
          </Link>
        );
      })}
      {!demo && (
        <Link href={`/house?${q}&fresh=1`} className="sn-item" aria-label="Scan this repo again">
          <span className="sn-icon" aria-hidden="true" style={{ fontSize: 20 }}>↻</span>
          <span className="sn-label">Rescan</span>
        </Link>
      )}
    </nav>
  );
}
