# Your git history is haunted (and Kiro helped me build the exorcist)

*Draft for dev.to — Kiroween 2026*

You deleted the Stripe key. You even force-pushed. It is still in 47 commits, every fork has it, and a bot read it four minutes after you pushed.

That sentence is the whole idea of **Haunted Repo**: a scanner that treats every problem in a repo as a creature in a haunted house. Ghosts are leaked secrets. Vampires are vulnerable dependencies. Spiders are insecure code. Seven more kinds follow, each with a pixel sprite whose size shows how dangerous it is.

## Why creatures?
Security tools produce lists. Lists get ignored. A haunted house with a score that drops as you banish things gets clicked. The live hunt, where creatures walk through a hallway and you click them away, turned "fix your lint warnings" into something people screenshot.

## Three things I learned

**1. A secret has three lives.** In the file, in history, and at the provider. A fix has to end all three: rotate at the provider, move to an env variable, rewrite history. Haunted Repo walks you through that as a four-step ritual with a boss-fight HP bar made of the commits that still hold the key.

**2. Never let the raw value escape.** Every finding carries only a masked value. Revoking a leaked GitHub token still works: the server seals the token with AES-GCM, the browser holds only ciphertext, and the server opens it only to call GitHub's revocation endpoint.

**3. Spec first saves days.** With Kiro I wrote EARS requirements, then a design, then small tasks for each area. Steering files kept rules like "always mask secrets" in every change. A hook scans every file I save with Haunted Repo itself, so the project guards its own commits.

## Try it
Open the demo repo, scroll through the front door, flip all ten trading cards (there is an eleventh), and click the moon three times.

`npx haunted-repo install-hook` keeps the next key out of your history.
