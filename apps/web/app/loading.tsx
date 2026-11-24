import { HauntedLoader } from "@/components/HauntedLoader";

/** Shown while a page is on its way (route changes). */
export default function Loading() {
  return <HauntedLoader label="The door creaks open…" />;
}
