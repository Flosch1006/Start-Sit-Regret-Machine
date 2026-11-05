import type { RosterPlayer, Slot } from "./types";

export interface Swap {
  /** started, but not part of the perfect lineup */
  sit: RosterPlayer;
  /** part of the perfect lineup, but did not start */
  start: RosterPlayer;
  /** points the swap would have added */
  gain: number;
  /** lineup position where the swap happens, e.g. "SFX" or "DT" */
  slot: string;
}

export interface Swaps {
  swaps: Swap[];
  /**
   * Fantrax lists a two-way player (e.g. WR and CB) once per role, so a roster
   * can have one more started row than there are players to bring in. The
   * leftover rows are returned here so their points are not lost.
   */
  extras: RosterPlayer[];
}

const sameBody = (a: RosterPlayer, b: RosterPlayer) => a.player === b.player && a.team === b.team;

/** Offense, defense and kicker never trade places; a two-way player belongs to two families. */
const OFFENSE = ["QB", "RB", "WR", "TE", "RWT", "SFX", "QWRT"];
function familiesOf(p: RosterPlayer): string[] {
  if (p.positions.includes("K")) return ["kicker"];
  const families: string[] = [];
  if (p.positions.some((x) => OFFENSE.includes(x))) families.push("offense");
  if (p.positions.some((x) => !OFFENSE.includes(x))) families.push("defense");
  return families;
}

/** "RWT2" -> "RWT" */
export const slotName = (slot: string) => slot.replace(/\d+$/, "");

/**
 * Pairs every player who should have sat with a player who should have started,
 * the way a manager would swap them:
 *  1. the perfect player of a slot replaces whoever really played that slot
 *     (Heyward for Allen at DT);
 *  2. every player left over replaces a leftover starter whose slot he is
 *     eligible for, the best scorer first (Gainwell for Rodgers at SFX).
 * The gains add up to exactly the points left on the bench.
 */
export function buildSwaps(roster: RosterPlayer[]): Swaps {
  const outs = roster.filter((p) => p.status === "Active" && p.perfect === null).sort((a, b) => a.points - b.points);
  const ins = roster.filter((p) => p.status !== "Active" && p.perfect !== null).sort((a, b) => b.points - a.points);

  const extras: RosterPlayer[] = [];
  const active = roster.filter((p) => p.status === "Active");
  // surplus started rows: prefer the second role of a two-way player
  while (outs.length > ins.length) {
    const dup = outs.findIndex((o) => active.filter((p) => sameBody(p, o)).length > 1);
    extras.push(...outs.splice(dup === -1 ? 0 : dup, 1));
  }

  const swaps: Swap[] = [];
  const add = (sit: RosterPlayer, start: RosterPlayer, slot: string) =>
    swaps.push({ sit, start, gain: start.points - sit.points, slot });

  // 1. same slot
  for (const start of [...ins]) {
    const slot = slotName(start.perfect ?? "");
    const at = outs.findIndex((o) => o.slot === slot);
    if (at === -1) continue;
    add(outs.splice(at, 1)[0], ins.splice(ins.indexOf(start), 1)[0], slot);
  }

  // 2. everyone left: the weakest starter first gets the best player who can fill his slot,
  //    else the best player of his family (offense, defense, kicker)
  for (const sit of [...outs]) {
    const fillsSlot = (p: RosterPlayer) =>
      sit.slot ? p.positions.includes(sit.slot) : p.positions.some((x) => sit.positions.includes(x));
    const sameFamily = (p: RosterPlayer) => familiesOf(p).some((f) => familiesOf(sit).includes(f));
    let at = ins.findIndex(fillsSlot);
    const direct = at !== -1;
    if (at === -1) at = ins.findIndex(sameFamily);
    if (at === -1) at = 0;
    const [start] = ins.splice(at, 1);
    if (!start) break;
    outs.splice(outs.indexOf(sit), 1);
    // when he cannot play the slot of the starter, the swap happens where he plays in the perfect lineup
    add(sit, start, direct && sit.slot ? sit.slot : slotName(start.perfect ?? ""));
  }

  swaps.sort((a, b) => b.gain - a.gain);
  return { swaps, extras };
}

export interface PerfectRow {
  slot: string;
  player: RosterPlayer | null;
}

/** The perfect lineup in slot order. */
export function perfectLineup(slots: Slot[], roster: RosterPlayer[]): PerfectRow[] {
  return slots.flatMap(({ pos, count }) =>
    Array.from({ length: count }, (_, i) => {
      const slot = `${pos}${i + 1}`;
      return { slot, player: roster.find((p) => p.perfect === slot) ?? null };
    }),
  );
}

export function lineupTotals(roster: RosterPlayer[]) {
  const sum = (players: RosterPlayer[]) => players.reduce((total, p) => total + p.points, 0);
  return {
    actual: sum(roster.filter((p) => p.status === "Active")),
    perfect: sum(roster.filter((p) => p.perfect !== null)),
  };
}
