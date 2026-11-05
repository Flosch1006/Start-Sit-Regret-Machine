import type { RosterPlayer, Slot } from "./types";

export interface Swap {
  /** started, but not part of the perfect lineup */
  sit: RosterPlayer;
  /** part of the perfect lineup, but did not start */
  start: RosterPlayer;
  /** points the swap would have added */
  gain: number;
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
    let at = outs.findIndex((o) => o.positions.includes(pos));
    if (at === -1) at = 0;
    const [sit] = outs.splice(at, 1);
    if (!sit) break;
    swaps.push({ sit, start, gain: start.points - sit.points });
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
