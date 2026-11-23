import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";

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
  return <ScanGate view="ritual" id={id} repo={repo ?? null} demo={demo === "1"} useCache />;
}
