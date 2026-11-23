# Design: Creatures UI

## Components

```
components/
  Logo.tsx
  RepoForm.tsx              input + gold submit, client
  Sprite.tsx                <span> with sheet background, steps(4) animation
  landing/HouseRide.tsx     sticky 3D scene, CSS only
  landing/CreatureExplainer.tsx
  landing/RitualSteps.tsx
  landing/KiroSection.tsx
  house/ScoreRing.tsx       SVG ring, lantern stroke
  house/CounterCard.tsx
  house/FilterChips.tsx
  house/CreatureCard.tsx    <button>
  house/DetailPanel.tsx
  house/PatchDialog.tsx     copy patch
  house/HauntedHouse.tsx    client state: filter, pinned, banished
  hunt/HuntScene.tsx        client, walking creatures
  hunt/HuntTooltip.tsx
```

## Sprite rendering

`public/sprites/sprites.json` gives frame size. Sheets are 4 frames horizontally.

```css
.sprite {
  width: var(--fw); height: var(--fh);
  background: var(--sheet) 0 0 / calc(var(--fw) * 4) var(--fh) no-repeat;
  image-rendering: pixelated;
  animation: sprite-frames 0.6s steps(4) infinite;
}
@keyframes sprite-frames { to { background-position-x: calc(var(--fw) * -4); } }
@media (prefers-reduced-motion: reduce) { .sprite { animation: none; } }
```

Severity scale is a `transform: scale()` of 1 / 0.8 / 0.6 on the sprite wrapper.

## Camera ride (landing)

- A 300 vh section with a sticky 100 vh stage. The stage has `perspective: 900px`.
- `view-timeline: --ride block` on the section. Three keyframe sets keyed to `animation-range`:
  - 0–35 %: door `rotateY(-100deg)` with `transform-origin: left`.
  - 35–70 %: house `translateZ(0 → 800px)` + scale, so the camera "moves through" the door.
  - 70–100 %: hallway fades in, creatures walk (normal time-based animation).
- `@supports not (animation-timeline: view())` and reduced motion: show hallway statically.

## State (haunted house)

```ts
const [filter, setFilter] = useState<"all" | CreatureKind>("all");
const [pinned, setPinned] = useState<string | null>(null);
const [hovered, setHovered] = useState<string | null>(null);
const [banished, setBanished] = useState<Set<string>>(new Set());
const active = hovered ?? pinned ?? findings[0]?.id;
const liveScore = score(findings, banished);
```

Banished state is persisted in `sessionStorage` keyed by repo, so the exorcism page and
the hunt see the same progress. Result data comes from `/api/scan`; the demo comes from
`lib/demo/spooky-shop.ts`.

## Live hunt movement

- Each creature gets a lane (top / bottom floor), a start x and a speed.
- Movement is a CSS animation `translateX` alternating, duration = base / speed control.
- Hover/focus sets `animation-play-state: paused`.
- Zombies flip horizontally when walking back (`scaleX(-1)` on alternate keyframe).

## Tokens (Tailwind theme)

`plum-night #160E22, crypt #22172F, dust #45345E, bone #F3ECDD, lantern #F2B544, teal #7FD6C9, zombie #9FD6A8`.
Fonts via `next/font/google`: Pirata One, Bricolage Grotesque, JetBrains Mono.
