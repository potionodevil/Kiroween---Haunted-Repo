import type { Metadata } from "next";
import { DEMO_RESULT } from "@haunted/core";
import { SeanceRoom } from "@/components/seance/SeanceRoom";

export const metadata: Metadata = { title: "Séance room · Haunted Repo" };

export default async function SeancePage({ searchParams }: { searchParams: Promise<{ repo?: string; demo?: string }> }) {
  const { repo, demo } = await searchParams;
  const isDemo = demo === "1" || !repo;
  const label = isDemo ? `${DEMO_RESULT.repo} at a3f91c2` : repo;
  return <SeanceRoom repoLabel={label} isDemo={isDemo} />;
}
