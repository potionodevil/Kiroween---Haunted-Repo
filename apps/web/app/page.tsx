import Link from "next/link";
import { CREATURE_KINDS } from "@haunted/core";
import { Sprite } from "@/components/Sprite";
import { HeroRide } from "@/components/landing/HeroRide";
import { KIND_LABEL } from "@/lib/sprites";

const RITUAL = [
  { title: "Revoke the key", body: "It stops working everywhere, including in old commits." },
  { title: "Move the new one to an environment variable", body: "We show the exact line to change for your framework." },
  { title: "Rewrite history", body: "One git filter-repo command removes it from every commit." },
  { title: "Install the guard", body: "A pre-commit hook stops the next key before it is committed." },
];

export default function Home() {
  return (
    <>
      <HeroRide />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section id="creatures" aria-labelledby="creatures-title" className="scroll-mt-6 py-24">
          <h2 id="creatures-title" className="font-display text-5xl sm:text-6xl">Ten kinds of trouble, one scan</h2>
          <p className="mt-3 max-w-xl text-bone/75">
            Every finding gets a creature, a severity and a fix you can apply right away. The bigger the creature, the more
            urgent the problem.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {CREATURE_KINDS.map((k) => {
              const c = KIND_LABEL[k];
              return (
                <article key={k} className="flex gap-5 rounded-2xl border border-dust bg-crypt p-6">
                  <div className="flex w-24 shrink-0 items-center justify-center">
                    <Sprite kind={k} scale={0.6} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{k === "possessed" ? "The possessed" : c.many}</h3>
                    <p className="text-sm text-lantern">{c.meaning}</p>
                    <p className="mt-2 text-sm text-bone/80">{c.description}</p>
                    <p className="mt-2 text-sm text-zombie">Fix: {c.fixLine}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="ritual" aria-labelledby="ritual-title" className="grid scroll-mt-6 gap-10 py-20 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 id="ritual-title" className="font-display text-5xl sm:text-6xl">The exorcism</h2>
            <p className="mt-4 max-w-sm text-bone/75">
              A leaked key is not gone when you delete the line. These four steps are, in this order, what actually makes it
              harmless.
            </p>
          </div>
          <ol className="space-y-6">
            {RITUAL.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${i === 0 ? "bg-lantern text-plum-night" : "bg-dust text-bone"}`}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="text-sm text-bone/75">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="kiro-title" className="py-16">
          <div className="grid items-center gap-8 rounded-3xl border border-dust bg-crypt p-8 sm:p-12 md:grid-cols-2">
            <div>
              <h2 id="kiro-title" className="font-display text-5xl leading-none">Built with Kiro, guarded by itself</h2>
              <p className="mt-5 text-bone/80">
                Specs shaped the scanner, steering keeps every secret masked, and a Kiro hook runs Haunted Repo on its own
                commits before they land.
              </p>
              <Link href="/house?demo=1" className="mt-6 inline-block rounded-lg bg-lantern px-5 py-3 font-semibold text-plum-night hover:brightness-105">
                Try the live demo
              </Link>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-dust bg-plum-night p-5 font-mono text-sm leading-relaxed text-bone/85">
{`.kiro/
  specs/scanner-core/
  specs/creatures-ui/
  specs/exorcism/
  steering/security.md
  hooks/secret-check.kiro.hook`}
            </pre>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-12 text-sm text-bone/60">
          <span>
            Haunted Repo, made for Kiroween 2026. MIT License.{" "}
            <a href="https://github.com/potionodevil/Kiroween---Haunted-Repo" className="underline underline-offset-2 hover:text-bone">
              Source
            </a>
          </span>
          <span>No ghosts were harmed. Only revoked.</span>
        </footer>
      </div>
    </>
  );
}
