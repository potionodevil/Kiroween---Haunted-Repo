import type { CreatureKind } from "@haunted/core";

/** Creatures that fly stay in the air; everything else walks on the floor. */
export const FLYING = new Set<CreatureKind>(["ghost", "bat", "banshee", "poltergeist", "possessed"]);
export const flies = (k: CreatureKind) => FLYING.has(k);

/**
 * Picks the next lane for a creature from the air or the floor list, so flyers never walk
 * and walkers never float. Lanes are reused in order within each list.
 */
export function laneFor<T>(kind: CreatureKind, air: T[], ground: T[], used: { air: number; ground: number }): T {
  if (flies(kind)) return air[used.air++ % air.length]!;
  return ground[used.ground++ % ground.length]!;
}
