import Link from "next/link";
import { Sprite } from "./Sprite";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 rounded-md">
      <Sprite kind="ghost" scale={0.22} />
      <span className="font-display text-2xl leading-none">Haunted Repo</span>
    </Link>
  );
}
