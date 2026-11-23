import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";
import { HauntedHouse } from "@/components/house/HauntedHouse";

export const metadata: Metadata = { title: "The haunted house · Haunted Repo" };

export default async function HousePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; demo?: string; cached?: string }>;
}) {
  const { repo, demo, cached } = await searchParams;
  return (
    <ScanGate repo={repo ?? null} demo={demo === "1"} useCache={cached === "1"}>
      {(ctx) => <HauntedHouse result={ctx.result} demo={ctx.demo} />}
    </ScanGate>
  );
}
