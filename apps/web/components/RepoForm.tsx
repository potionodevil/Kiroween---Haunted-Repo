"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { parseRepo } from "@haunted/core";

export function RepoForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        const ref = parseRepo(value);
        if (!ref) {
          setError("That does not look like a GitHub repo");
          return;
        }
        router.push(`/house?repo=${encodeURIComponent(`${ref.owner}/${ref.repo}`)}`);
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">GitHub repository</label>
        <input
          id={inputId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="github.com/you/your-repo"
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className="min-w-0 flex-1 rounded-lg border border-dust bg-crypt px-4 py-3 font-mono text-sm placeholder:text-bone/40"
        />
        <button type="submit" className="rounded-lg bg-lantern px-5 py-3 font-semibold text-plum-night hover:brightness-105">
          Scan my repo
        </button>
      </div>
      <p id={hintId} className={`mt-2 text-xs ${error ? "text-lantern" : "text-bone/60"}`}>
        {error ?? "Free for public repos. Secrets are masked and never stored."}
      </p>
    </form>
  );
}
