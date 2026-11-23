import Link from "next/link";
import type { CSSProperties } from "react";
import type { CreatureKind } from "@haunted/core";
import { Logo } from "@/components/Logo";
import { RepoForm } from "@/components/RepoForm";
import { Sprite } from "@/components/Sprite";
import { Hallway } from "@/components/Hallway";
import { FACES_RIGHT } from "@/lib/sprites";
import { PixelScene } from "./PixelScene";

/**
 * Hero + scroll-driven camera ride (CSS view-timeline, see globals.css):
 * the copy fades, the camera flies through the glowing door, the hallway appears.
 */
export function HeroRide() {
  return (
    <section className="ride">
      <div className="ride-stage">
        <div className="ride-scene">
          <PixelScene className="absolute inset-0 size-full" />
        </div>
        {/* keeps the copy readable over the scene */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-plum-night/85 via-plum-night/40 to-transparent" />

        <div className="ride-copy relative z-10 mx-auto flex min-h-[inherit] max-w-6xl flex-col px-4 sm:px-6">
          <header className="flex items-center justify-between py-5">
            <Logo />
            <nav aria-label="Main" className="flex gap-6 text-sm text-bone/80">
              <a href="#creatures" className="hidden hover:text-bone sm:inline">What it finds</a>
              <a href="#ritual" className="hidden hover:text-bone sm:inline">How fixing works</a>
              <Link href="/house?demo=1" className="hover:text-bone">Live demo</Link>
            </nav>
          </header>
          <div className="max-w-xl pt-[8vh] pb-24">
            <h1 className="font-display text-6xl leading-[0.95] drop-shadow-[0_2px_0_rgba(0,0,0,0.4)] sm:text-8xl">
              Your git history
              <br />
              is haunted.
            </h1>
            <p className="mt-6 max-w-md text-lg text-bone/85">
              You deleted the API key months ago. It is still in commit a3f91c2, waiting. Haunted Repo finds it, together
              with the bugs and slow code hiding next to it.
            </p>
            <RepoForm hint="Free for public repos. Secrets are masked and never stored. Scroll to step inside." />
            <Link href="/house?demo=1" className="mt-4 inline-block text-sm text-lantern underline underline-offset-4">
              Try a haunted demo repo
            </Link>
          </div>
        </div>

        <div className="ride-hall" aria-hidden="true">
          <Hallway className="absolute inset-0 size-full" />
          <Walker kind="ghost" bottom="38%" x0={6} x1={30} seconds={9} delay={0} />
          <Walker kind="skeleton" bottom="38%" x0={18} x1={44} seconds={14} delay={-3} />
          <Walker kind="vampire" bottom="16%" x0={34} x1={58} seconds={12} delay={-5} />
          <Walker kind="zombie" bottom="16%" x0={8} x1={36} seconds={15} delay={-1} />
          <Walker kind="poltergeist" top="12%" x0={40} x1={62} seconds={8} delay={-2} />
          <Walker kind="bat" top="10%" x0={68} x1={88} seconds={6} delay={-4} />
          <Walker kind="spider" bottom="9%" x0={58} x1={80} seconds={10} delay={-6} />
          <Walker kind="mummy" bottom="12%" x0={64} x1={86} seconds={16} delay={-2} />
          <div className="absolute inset-x-0 top-[6%] px-6 text-center">
            <p className="font-display text-4xl sm:text-6xl">Something is already walking around</p>
            <p className="mt-2 text-sm text-bone/75">Ghosts are leaked secrets. Zombies are bugs. Bats are slow code. And seven more.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Walker({
  kind,
  x0,
  x1,
  seconds,
  delay,
  top,
  bottom,
}: {
  kind: CreatureKind;
  x0: number;
  x1: number;
  seconds: number;
  delay: number;
  top?: string;
  bottom?: string;
}) {
  const style = {
    top,
    bottom,
    left: `${x0}%`,
    "--x0": `${x0}%`,
    "--x1": `${x1}%`,
    "--d": `${seconds}s`,
    "--delay": `${delay}s`,
  } as CSSProperties;
  return (
    <div className="hunt-mover absolute" style={style}>
      <span className={FACES_RIGHT.has(kind) ? "hunt-flip inline-block" : "inline-block"}>
        <Sprite kind={kind} scale={0.7} />
      </span>
    </div>
  );
}
