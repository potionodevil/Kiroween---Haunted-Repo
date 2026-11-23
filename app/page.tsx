import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RepoForm } from "@/components/RepoForm";

// Hero only. The scroll camera ride (creatures-ui task 3.2) comes later.
export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/house?demo=1" className="text-sm text-bone/75 hover:text-bone">Live demo</Link>
      </header>
      <main className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
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
          <Link href="/house?demo=1" className="mt-6 inline-block text-sm text-lantern underline underline-offset-4">
            Try the demo repo
          </Link>
        </div>
        <House />
      </main>
    </div>
  );
}

function House() {
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
