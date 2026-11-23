import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";

export const metadata: Metadata = { title: "Autopsy report · Haunted Repo" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ repo?: string; demo?: string }> }) {
  const { repo, demo } = await searchParams;
  return <ScanGate view="report" repo={repo ?? null} demo={demo === "1"} useCache />;
}
