/**
 * Pass-through for OpenAI and Mistral chat completions (CORS). Forwards and stores nothing:
 * no logging of bodies, keys or answers (security.md rule 4). Pure apart from the injected fetch, so it is testable.
 */
const ENDPOINT = {
  openai: "https://api.openai.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
} as const;

export type ProxyProvider = keyof typeof ENDPOINT;

export interface ProxyInput {
  provider: string;
  key: string;
  model: string;
  system: string;
  user: string;
}

export type ProxyResult = { status: number; body: { text?: string; error?: string } };

export function validate(x: unknown): ProxyInput | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  const ok = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  if (!(o.provider === "openai" || o.provider === "mistral")) return null;
  if (!ok(o.key, 300) || !ok(o.model, 100) || !ok(o.system, 20_000) || !ok(o.user, 60_000)) return null;
  return o as unknown as ProxyInput;
}

export async function forward(input: ProxyInput, fetchImpl: typeof fetch = fetch): Promise<ProxyResult> {
  const url = ENDPOINT[input.provider as ProxyProvider];
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.key}` },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
  } catch {
    return { status: 502, body: { error: "Could not reach the provider." } };
  }
  if (res.status === 401 || res.status === 403) return { status: 401, body: { error: "The key was rejected." } };
  if (res.status === 429) return { status: 429, body: { error: "Rate limited by the provider. Try again in a minute." } };
  if (!res.ok) return { status: 502, body: { error: `The provider answered ${res.status}.` } };
  const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: unknown } }[] } | null;
  const content = json?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => (typeof c === "object" && c && "text" in c ? String((c as { text: unknown }).text) : "")).join("") : "";
  return text ? { status: 200, body: { text } } : { status: 502, body: { error: "The provider returned no text." } };
}
