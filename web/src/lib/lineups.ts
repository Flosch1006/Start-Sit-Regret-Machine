import type { RosterPlayer, Slot } from "./types";

export interface Swap {
  /** started, but not part of the perfect lineup */
  sit: RosterPlayer;
  /** part of the perfect lineup, but did not start */
  start: RosterPlayer;
  /** points the swap would have added */
  gain: number;
  /** lineup position the new player takes in the perfect lineup, e.g. "SFX" or "ER" */
  slot: string;
}

export interface Swaps {
  swaps: Swap[];
  /**
   * Fantrax lists a two-way player (e.g. WR and CB) once per role, so a roster
   * can have one more started row than the perfect lineup has swaps. Those
   * leftover rows are returned here so their points are not lost.
   */
  extras: RosterPlayer[];
}

const sameBody = (a: RosterPlayer, b: RosterPlayer) => a.player === b.player && a.team === b.team;
const basePos = (slot: string) => slot.replace(/\d+$/, "");

/** Offense, defense and kicker never trade places, whatever the flex slots do. */
type Family = "offense" | "defense" | "kicker";
const OFFENSE = ["QB", "RB", "WR", "TE", "RWT", "SFX", "QWRT"];
const familyOfSlot = (pos: string): Family => (pos === "K" ? "kicker" : OFFENSE.includes(pos) ? "offense" : "defense");
/** A two-way player (WR and CB) belongs to two families. */
function familiesOfPlayer(p: RosterPlayer): Family[] {
  if (p.positions.includes("K")) return ["kicker"];
  const families: Family[] = [];
  if (p.positions.some((pos) => OFFENSE.includes(pos))) families.push("offense");
  if (p.positions.some((pos) => !OFFENSE.includes(pos))) families.push("defense");
  return families;
}

/**
 * The actual slot of a started player is not in the data, so lineups are not
 * compared slot by slot. Instead every player who should have sat is paired
 * with a player who should have started: same position where possible, the
 * biggest gain first. The gains add up to exactly the points left on the bench.
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
  for (const start of ins) {
    const pos = basePos(start.perfect ?? "");
    const family = familyOfSlot(pos);
    // same position first, then the same family; only without any candidate in the family take the lowest scorer
    let at = outs.findIndex((o) => o.positions.includes(pos));
    if (at === -1) at = outs.findIndex((o) => familiesOfPlayer(o).length === 1 && familiesOfPlayer(o)[0] === family);
    if (at === -1) at = outs.findIndex((o) => familiesOfPlayer(o).includes(family));
    if (at === -1) at = 0;
    const [sit] = outs.splice(at, 1);
    if (!sit) break;
    swaps.push({ sit, start, gain: start.points - sit.points, slot: pos });
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
