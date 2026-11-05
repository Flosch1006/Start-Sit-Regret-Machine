import type { RosterPlayer, Slot } from "./types";

export interface Changes {
  /** started, but not part of the perfect lineup; lowest scorer first */
  sat: RosterPlayer[];
  /** part of the perfect lineup, but did not start; highest scorer first */
  started: RosterPlayer[];
  /** points of the players who should have sat */
  satPoints: number;
  /** points of the players who should have started */
  startedPoints: number;
}

const sum = (players: RosterPlayer[]) => players.reduce((total, p) => total + p.points, 0);

/**
 * Who has to leave the lineup and who has to come in to make it perfect.
 * The two lists are deliberately not paired: the perfect lineup shuffles
 * players between flex slots, so "A for B" would suggest swaps that nobody
 * could make. What is exact is the total: startedPoints - satPoints is the
 * number of points left on the bench.
 */
export function buildChanges(roster: RosterPlayer[]): Changes {
  const sat = roster.filter((p) => p.status === "Active" && p.perfect === null).sort((a, b) => a.points - b.points);
  const started = roster.filter((p) => p.status !== "Active" && p.perfect !== null).sort((a, b) => b.points - a.points);
  return { sat, started, satPoints: sum(sat), startedPoints: sum(started) };
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
  return {
    actual: sum(roster.filter((p) => p.status === "Active")),
    perfect: sum(roster.filter((p) => p.perfect !== null)),
  };
}

/** "RWT2" -> "RWT" */
export const slotName = (slot: string) => slot.replace(/\d+$/, "");
