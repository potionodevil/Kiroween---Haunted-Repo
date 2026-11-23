# Requirements: watcher CLI and pre-commit guard (features 15 and 16)

1. WHEN a saved file contains a secret and `npx haunted-repo watch` runs THEN the watcher SHALL replace the literal with an env lookup for the file type (process.env in JS/TS, os.environ in Python, a placeholder in YAML/JSON/TOML/shell), write the value to .env.local, add .env* and .haunted/backup/ to .gitignore, back up the original in .haunted/backup/, and print a masked diff and an undo command.
2. The watcher SHALL be opt-in, local only, never use the network, and support --dry-run.
3. `undo <backup>` SHALL restore the original byte for byte (property-based tested).
4. `install-hook` SHALL install a pre-commit hook that blocks commits adding a secret; the bypass SHALL be typed out in full.
5. `scan`, `report` and `mcp` SHALL share the scanners with the web app.
