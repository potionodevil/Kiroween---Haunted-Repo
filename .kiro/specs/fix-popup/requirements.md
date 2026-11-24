# Requirements: fix popup on creature cards

1. WHEN the user hovers or focuses a creature card THEN a popup SHALL show the creature kind, rule, plain fix text and up to 9 lines of the change.
2. The preview SHALL include the `haunted-repo:` marker line the pull request will add.
3. WHEN the creature is auto-fixable THEN the popup SHALL offer "Fix it in the repo", which opens a pull request with only that fix.
4. Ghosts SHALL offer "Start the exorcism" instead. Creatures without a safe fix SHALL say so.
5. WHEN the user is not logged in THEN the button SHALL go to GitHub login and come back to the same house.
6. The popup SHALL stay reachable by keyboard (focus-within) and SHALL not animate under prefers-reduced-motion.
