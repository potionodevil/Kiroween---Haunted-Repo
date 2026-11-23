# Design: AI medium

- `apps/web/lib/client/ai.ts`: module-level session (provider, key, model), never persisted.
- Anthropic: official `@anthropic-ai/sdk` in the browser (the key belongs to the user), model `claude-opus-5-5`, `output_config.effort: "medium"`, beta `server-side-fallback-2026-07-01` with `fallbacks: "default"`, refusals handled.
- OpenAI and Mistral: `/api/ai` relay; `lib/ai-proxy.ts` has a pure `forward()` with an injected fetch, so the no-logging test needs no network.
- `lib/ai-prompts.ts`: system prompts, finding payload (masked only), attack-path JSON contract and an id-validating parser.
- `lib/ai-demo.ts`: prepared answers and a prepared attack path for the demo repo.
- UI: `components/ai/{AiMedium,AiKeyForm,AttackPath}.tsx`.
