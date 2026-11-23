# haunted-repo

Find leaked secrets, vulnerable dependencies, insecure code, unsafe CI, AI-agent risks, bugs, slow code, weak docs and architecture problems. Guard your repo with a pre-commit hook, a watcher and an MCP server for Kiro.

```
npx haunted-repo scan               # scan the working tree offline
npx haunted-repo scan owner/repo    # scan a public GitHub repo
npx haunted-repo install-hook       # block commits that add a secret
npx haunted-repo watch              # move secrets from saved files into .env.local
npx haunted-repo report > autopsy.md
npx haunted-repo mcp                # MCP server (stdio) for Kiro and other agents
```

Secrets are always masked. The watcher and the hook never use the network. MIT license.
