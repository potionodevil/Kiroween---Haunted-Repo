# Requirements: Creatures UI

## Introduction

The UI turns findings into creatures. It has three screens: the landing page with a
scroll-driven camera ride, the scan result ("the haunted house") and the live hunt.
Design tokens and rules come from `.kiro/steering/product.md`.

## Requirement 1: Landing page

**User story:** As a visitor, I want to understand the idea in seconds and start a scan, so that I try it right away.

1. The page SHALL show the headline "Your git history is haunted.", a short intro, a repo input and a gold "Scan my repo" button above the fold.
2. The page SHALL show a house illustration on the right with a door and three windows.
3. WHEN the user scrolls THEN the page SHALL play three phases driven by CSS `view-timeline`: door opens, camera moves through the door, hallway with walking creatures ("Something is already walking around").
4. IF the browser does not support `animation-timeline` OR `prefers-reduced-motion: reduce` is set THEN the page SHALL show a static hallway instead.
5. Below the ride the page SHALL show: the three creatures explained, the exorcism ritual in 4 steps, a "Built with Kiro" section.
6. The page SHALL offer a "Try the demo repo" link that opens a fake scan result.

## Requirement 2: Haunted house (scan result)

**User story:** As a developer, I want to see all problems at a glance and fix them, so that my repo gets clean.

1. The page SHALL show a header with repo name, "Fix all auto-fixable (N)" and "New scan".
2. The page SHALL show the Haunting score ring (0–100), label, commits/files/duration, and one counter card per creature kind.
3. The page SHALL show "N creatures haunt this repo" and filter chips "All N", "Ghosts N", "Zombies N", "Bats N" with live counts.
4. Each finding SHALL be a card with a sprite scaled by severity (100/80/60 %), title, file path, commit hash and severity badge.
5. WHEN a card is hovered or focused THEN the detail panel SHALL show severity, kind, rule, title, explanation, location and suggested fix.
6. WHEN a card is clicked THEN the panel SHALL pin to that finding.
7. WHEN the finding is auto-fixable THEN the panel SHALL show "Fix it now"; WHEN clicked THEN the patch SHALL be shown for copying and the creature SHALL be banished.
8. WHEN the finding is a ghost THEN the panel SHALL show "Mark as exorcised" and "Open the exorcism ritual".
9. WHEN "Fix all auto-fixable" is clicked THEN every auto-fixable zombie and bat SHALL be banished and a combined patch SHALL be offered.
10. Banished creatures SHALL fade to 35 % opacity with a "Fixed" badge, and the score SHALL drop at once.
11. While scanning, the page SHALL show a loading state with walking creatures and progress text. Errors SHALL be shown in plain words with a retry button.

## Requirement 3: Live hunt

**User story:** As a presenter, I want creatures walking around that I can banish, so that the demo is fun to watch.

1. Creatures SHALL walk/float/flap across a hallway scene using sprite sheets animated with `steps(4)`.
2. WHEN a creature is hovered or focused THEN it SHALL freeze and show a tooltip with severity, rule and fix.
3. WHEN a creature is clicked THEN its fix SHALL be applied (banished) with a short vanish animation.
4. WHEN no creatures are left THEN the scene SHALL show "The house is quiet".
5. The header SHALL show "N left · M banished", a speed control and "Rescan".
6. IF `prefers-reduced-motion: reduce` THEN creatures SHALL stand still at fixed positions.

## Requirement 4: Accessibility

1. Every creature SHALL be a `<button>` with an accessible name like "Critical ghost: Stripe live key in config/payments.js, commit a3f91c2".
2. All interactions SHALL work by keyboard; focus SHALL be visible (gold 2 px outline).
3. Text contrast SHALL be ≥ 4.5:1.
4. Layout SHALL work from 360 px width; the detail panel becomes a bottom sheet on mobile.
