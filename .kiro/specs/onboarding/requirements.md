# Requirements: onboarding, loader and side decorations

1. WHEN a visitor opens the haunted house for the first time in this browser THEN a 4-step tour SHALL explain creatures, the fix popup, the terminal score and login/séance/report.
2. The tour SHALL have Next, Back and Skip, SHALL be a modal dialog with a label, and SHALL store only a "seen" flag in localStorage. A "?" button SHALL reopen it.
3. WHILE a scan runs THEN the loader SHALL show creatures walking a hallway and a terminal of scan stages; the last stage SHALL wait until the scan returns.
4. On screens at least 1440px wide, decorations (cobwebs, spider, bat, candles, lantern) SHALL fill the side margins. They SHALL be aria-hidden, never clickable, and still under prefers-reduced-motion.
