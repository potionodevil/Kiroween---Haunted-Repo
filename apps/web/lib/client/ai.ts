"use client";
import Anthropic from "@anthropic-ai/sdk";

/**
 * AI medium (feature 5): bring your own key for Anthropic, OpenAI or Mistral.
 * The key lives in this module's memory for the current tab only: never localStorage, sessionStorage,
 * cookies or logs (security.md rule 3). Anthropic is called from the browser with the official SDK;
 * OpenAI and Mistral go through /api/ai, which forwards and stores nothing (rule 4).
 */
export type Provider = "anthropic" | "openai" | "mistral";

export const PROVIDERS: Record<Provider, { label: string; model: string; keyHint: string }> = {
  anthropic: { label: "Anthropic (Claude)", model: "claude-opus-5-5", keyHint: "sk-ant-…" },
  openai: { label: "OpenAI", model: "gpt-5", keyHint: "sk-…" },
  mistral: { label: "Mistral", model: "mistral-large-latest", keyHint: "Mistral API key" },
};

interface Session {
  provider: Provider;
  key: string;
  model: string;
}
let session: Session | null = null;
const listeners = new Set<() => void>();

export function setAiSession(s: Session | null) {
  session = s && s.key.trim() ? { ...s, key: s.key.trim() } : null;
  listeners.forEach((l) => l());
}
export function getAiSession(): Readonly<Omit<Session, "key">> & { hasKey: boolean } {
  return { provider: session?.provider ?? "anthropic", model: session?.model ?? PROVIDERS.anthropic.model, hasKey: Boolean(session) };
}
export function onAiSession(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export interface AiRequest {
  system: string;
  user: string;
}

export class AiError extends Error {}

/** Sends one request. Returns plain text; refusals and errors become AiError with a readable message. */
export async function askAi(req: AiRequest): Promise<string> {
  if (!session) throw new AiError("Add your API key first.");
  const { provider, key, model } = session;

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1 });
    try {
      const res = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        // Server-side fallback on a policy decline (enabled by default for Claude Opus 5.5).
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      });
      if (res.stop_reason === "refusal") throw new AiError("The model declined this request.");
      const text = res.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new AiError("The model returned no text.");
      return text;
    } catch (e) {
      if (e instanceof AiError) throw e;
      if (e instanceof Anthropic.AuthenticationError) throw new AiError("The Anthropic key was rejected.");
      if (e instanceof Anthropic.RateLimitError) throw new AiError("Rate limited by Anthropic. Try again in a minute.");
      if (e instanceof Anthropic.APIError) throw new AiError(`Anthropic answered ${e.status ?? "with an error"}.`);
      throw new AiError("Could not reach Anthropic.");
    }
  }

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, key, model, system: req.system, user: req.user }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !data.text) throw new AiError(data.error ?? `The provider answered ${res.status}.`);
  return data.text;
}
