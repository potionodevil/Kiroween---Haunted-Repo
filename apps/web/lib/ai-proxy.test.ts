import { afterEach, describe, expect, it, vi } from "vitest";
import { forward, validate } from "./ai-proxy";

const input = { provider: "mistral", key: "secret-key-123", model: "mistral-large-latest", system: "SYS-TEXT", user: "USER-TEXT" };

afterEach(() => vi.restoreAllMocks());

describe("AI proxy (security.md rule 4)", () => {
  it("forwards to the provider and never logs bodies, keys or answers", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "ANSWER" } }] }), { status: 200 }));
    const r = await forward(validate(input)!, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ status: 200, body: { text: "ANSWER" } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key-123");
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("rejects unknown providers and oversized input", () => {
    expect(validate({ ...input, provider: "anthropic" })).toBeNull();
    expect(validate({ ...input, user: "x".repeat(60_001) })).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it("maps provider errors without echoing their body", async () => {
    const fetchImpl = vi.fn(async () => new Response("detailed error with secret-key-123", { status: 401 }));
    const r = await forward(validate(input)!, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ status: 401, body: { error: "The key was rejected." } });
  });
});
