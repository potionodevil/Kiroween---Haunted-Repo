
export class GitHubError extends Error {
  constructor(
    public status: 400 | 404 | 429 | 502,
    message: string,
    public resetAt?: string,
  ) {
    super(message);
  }
}

const API = "https://api.github.com";

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "haunted-repo",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function gh<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), signal, cache: "no-store" });
  if (res.ok) return (await res.json()) as T;
  if (res.status === 404 || res.status === 451) {
    throw new GitHubError(404, "We can only see public repos");
  }
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 429 || (res.status === 403 && remaining === "0")) {
    const reset = Number(res.headers.get("x-ratelimit-reset") ?? 0);
    const at = reset ? new Date(reset * 1000).toISOString() : undefined;
    throw new GitHubError(429, "GitHub needs a break. Try again later.", at);
  }
  throw new GitHubError(502, `GitHub answered ${res.status}`);
}

export async function raw(owner: string, repo: string, ref: string, path: string, signal?: AbortSignal) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const res = await fetch(url, { signal, cache: "no-store", headers: { "User-Agent": "haunted-repo" } });
  if (!res.ok) return null;
  return res.text();
}

/** Runs `fn` over items with at most `limit` in flight. Stops starting new work once aborted. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      try {
        out[i] = await fn(items[i]!);
      } catch (e) {
        if (signal?.aborted) return;
        if (e instanceof GitHubError && e.status === 429) throw e;
        // a single failed item is skipped
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out.filter((x) => x !== undefined);
}
