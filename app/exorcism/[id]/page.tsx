import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";
import { Ritual } from "@/components/exorcism/Ritual";

export const metadata: Metadata = { title: "Exorcism ritual · Haunted Repo" };

export default async function ExorcismPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ repo?: string; demo?: string }>;
}) {
  const { id } = await params;
  const { repo, demo } = await searchParams;
  return (
    <ScanGate repo={repo ?? null} demo={demo === "1"} useCache>
      {(ctx) => <Ritual id={id} ctx={ctx} />}
    </ScanGate>
  );
}
