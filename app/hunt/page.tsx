import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";
import { HuntScene } from "@/components/hunt/HuntScene";

export const metadata: Metadata = { title: "Live hunt · Haunted Repo" };

export default async function HuntPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; demo?: string }>;
}) {
  const { repo, demo } = await searchParams;
  return (
    <ScanGate repo={repo ?? null} demo={demo === "1"} useCache>
      {(ctx) => <HuntScene ctx={ctx} />}
    </ScanGate>
  );
}
