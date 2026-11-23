"use client";
import { useCallback, useEffect, useState } from "react";
import { loadBanished, saveBanished } from "./session";

export function useBanished(repo: string) {
  const [banished, setBanished] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBanished(loadBanished(repo));
  }, [repo]);

  const banish = useCallback(
    (ids: string[]) => {
      setBanished((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        saveBanished(repo, next);
        return next;
      });
    },
    [repo],
  );

  const reset = useCallback(() => {
    const empty = new Set<string>();
    saveBanished(repo, empty);
    setBanished(empty);
  }, [repo]);

  return { banished, banish, reset };
}
