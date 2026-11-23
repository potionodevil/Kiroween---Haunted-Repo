import type { Metadata } from "next";
import { HouseLoader } from "@/components/house/HouseLoader";

export const metadata: Metadata = { title: "The haunted house · Haunted Repo" };

export default async function HousePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; demo?: string }>;
}) {
  const { repo, demo } = await searchParams;
  return <HouseLoader repo={repo ?? null} demo={demo === "1"} />;
}
