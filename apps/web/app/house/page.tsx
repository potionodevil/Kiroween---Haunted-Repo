import type { Metadata } from "next";
import { ScanGate } from "@/components/ScanGate";

export const metadata: Metadata = { title: "The haunted house · Haunted Repo" };

export default async function HousePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; demo?: string; fresh?: string }>;
}) {
  const { repo, demo, fresh } = await searchParams;
  return <ScanGate view="house" repo={repo ?? null} demo={demo === "1"} useCache={fresh !== "1"} />;
}
