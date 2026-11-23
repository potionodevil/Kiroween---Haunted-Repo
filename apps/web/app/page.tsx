import Link from "next/link";
import type { CreatureKind } from "@haunted/core";
import { Logo } from "@/components/Logo";
import { RepoForm } from "@/components/RepoForm";
import { Sprite } from "@/components/Sprite";
import { HouseRide } from "@/components/landing/HouseRide";

const CREATURES: { kind: CreatureKind; name: string; is: string; example: string; color: string }[] = [
  {
    kind: "ghost",
    name: "Ghosts",
    is: "Leaked secrets in your git history. Deleting the file does not remove them.",
    example: "Stripe live key in config/payments.js · a3f91c2",
    color: "text-bone",
  },
  {
    kind: "zombie",
    name: "Zombies",
    is: "Bugs the linter finds at HEAD: unhandled promises, loose equality, dead variables.",
    example: "Unhandled promise in src/checkout.ts:88",
    color: "text-zombie",
  },
  {
    kind: "bat",
    name: "Bats",
    is: "Slow code: queries in loops, full library imports, listeners that never leave.",
    example: "N+1 query in loop in src/orders.ts:42",
    color: "text-teal",
  },
];

const RITUAL = [
  { title: "Roll the key", body: "Revoke it at the provider. The old key stops working right away." },
  { title: "Move it to an env variable", body: "The new key lives in your host's settings, never in a commit." },
  { title: "Rewrite history", body: "git filter-repo removes every copy from every commit. Then force-push." },
  { title: "Keep it from coming back", body: "A pre-commit hook scans each commit before it leaves your machine." },
];

const KIRO = [
  { label: "Specs", text: "scanner, creatures-ui and exorcism, each with requirements, design and tasks." },
  { label: "Steering", text: "security.md makes every secret masked to 4 characters, everywhere." },
  { label: "Hooks", text: "Tests run on save. A secret check runs on the code Kiro writes." },
  { label: "Property tests", text: "fast-check proves masking never shows more than 4 characters." },
];

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Logo />
          <nav aria-label="Main" className="flex gap-5 text-sm text-bone/75">
            <a href="#creatures" className="hidden hover:text-bone sm:inline">What it finds</a>
            <a href="#ritual" className="hidden hover:text-bone sm:inline">How fixing works</a>
            <Link href="/house?demo=1" className="hover:text-bone">Live demo</Link>
          </nav>
        </header>

        <main className="grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl">
              Your git history
              <br />
              is haunted.
            </h1>
            <p className="mt-6 max-w-md text-bone/80">
              You deleted the API key months ago. It is still in commit <span className="font-mono">a3f91c2</span>,
              waiting. Haunted Repo finds it, together with the bugs and slow code hiding next to it.
            </p>
            <RepoForm />
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <Link href="/house?demo=1" className="text-lantern underline underline-offset-4">Try the demo repo</Link>
              <span className="text-bone/50">Scroll to step inside ↓</span>
            </div>
          </div>
          <HeroHouse />
        </main>
      </div>

      <HouseRide />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section id="creatures" aria-labelledby="creatures-title" className="scroll-mt-6 py-20">
          <h2 id="creatures-title" className="font-display text-5xl">Three kinds of creatures</h2>
          <p className="mt-2 text-bone/70">Bigger creature, bigger risk. Each one comes with an explanation and a fix.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CREATURES.map((c) => (
              <article key={c.kind} className="rounded-2xl border border-dust bg-crypt p-6">
                <div className="flex h-28 items-center">
                  <Sprite kind={c.kind} scale={0.85} />
                </div>
                <h3 className={`mt-3 text-xl font-bold ${c.color}`}>{c.name}</h3>
                <p className="mt-1.5 text-sm text-bone/80">{c.is}</p>
                <p className="mt-4 font-mono text-xs text-bone/55">{c.example}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ritual" aria-labelledby="ritual-title" className="scroll-mt-6 py-16">
          <h2 id="ritual-title" className="font-display text-5xl">The exorcism ritual</h2>
          <p className="mt-2 max-w-xl text-bone/70">
            Zombies and bats get a patch you can copy. A ghost needs four steps, because a deleted key still lives in history.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {RITUAL.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-dust bg-crypt p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-lantern font-bold text-plum-night">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-bone/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="kiro-title" className="py-16">
          <h2 id="kiro-title" className="font-display text-5xl">Built with Kiro</h2>
          <p className="mt-2 max-w-xl text-bone/70">
            Everything lives in the <span className="font-mono">.kiro</span> folder of the repo.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {KIRO.map((k) => (
              <div key={k.label} className="rounded-2xl border border-dust bg-crypt p-5">
                <dt className="font-semibold text-lantern">{k.label}</dt>
                <dd className="mt-1 text-sm text-bone/80">{k.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-16 text-center">
          <h2 className="font-display text-5xl">Ready to look inside?</h2>
          <div className="mx-auto max-w-xl text-left">
            <RepoForm />
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dust py-8 text-sm text-bone/60">
          <span>Haunted Repo · Kiroween 2026 · MIT</span>
          <a href="https://github.com/potionodevil/Kiroween---Haunted-Repo" className="hover:text-bone">Source on GitHub</a>
        </footer>
      </div>
    </>
  );
}

function HeroHouse() {
  return (
    <svg viewBox="0 0 300 280" className="mx-auto w-full max-w-md" aria-hidden="true">
      <rect x="215" y="20" width="30" height="80" fill="var(--color-crypt)" stroke="var(--color-dust)" strokeWidth="2" />
      <path d="M150 20 L290 120 L290 275 L10 275 L10 120 Z" fill="var(--color-crypt)" stroke="var(--color-dust)" strokeWidth="2" />
      <circle cx="150" cy="95" r="22" fill="#3a2a14" stroke="var(--color-lantern)" strokeWidth="2.5" />
      <rect x="35" y="150" width="45" height="60" rx="22" fill="#3a2a14" stroke="var(--color-lantern)" strokeWidth="2.5" />
      <rect x="220" y="150" width="45" height="55" rx="22" fill="var(--color-plum-night)" stroke="var(--color-dust)" strokeWidth="2" />
      <path d="M115 275 L115 200 A35 35 0 0 1 185 200 L185 275 Z" fill="#2c1f3d" stroke="var(--color-dust)" strokeWidth="2" />
    </svg>
  );
}
