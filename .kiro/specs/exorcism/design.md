# Design: Exorcism ritual

## Route

`app/exorcism/[id]/page.tsx` — reads the scan result for the current repo from
`sessionStorage` (client) or re-fetches `/api/scan` if missing.

## Data

```ts
interface RitualTemplate {
  rule: string;                 // "secret/stripe-live-key"
  provider: string;             // "Stripe"
  rotate: string;               // "Dashboard → Developers → API keys → Roll key."
  envVar: string;               // "STRIPE_SECRET_KEY"
  snippet: (envVar: string) => string;
}

interface RitualStep {
  id: "rotate" | "env" | "history" | "guard";
  title: string;
  body: string;
  command?: string;
}

function buildRitual(f: GhostFinding): RitualStep[];
```

Templates live in `lib/exorcism/templates.ts`. `buildRitual` is pure and unit-tested,
including a test that no step contains anything but the masked preview.

## Components

```
components/exorcism/
  GhostCard.tsx       sprite, badge, title, masked preview
  Timeline.tsx        born / copies / deleted / still readable
  StepList.tsx        checkbox steps, copy buttons
  ProgressBar.tsx
  ConfirmBar.tsx      Rescan + "Open fix branch as PR" (disabled unless OAuth stretch goal)
```

## Rescan

`POST /api/scan` with the same repo, then check `findings.some(f => f.id === id)`.
Finding ids for ghosts are stable: `g_<sha256(secret)[0..10]>` so they survive a rescan.

## Copy

`navigator.clipboard.writeText`, with a visible "Copied" state and `aria-live="polite"`.
