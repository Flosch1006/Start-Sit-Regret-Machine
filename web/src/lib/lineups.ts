import type { RosterPlayer, Slot } from "./types";

export interface LineupRow {
  slot: string;
  actual: RosterPlayer | null;
  perfect: RosterPlayer | null;
}

/**
 * Pairs every lineup slot with the player who really started there and the
 * player the perfect lineup would have used. Fantrax lists the active players
 * in slot order, so the n-th active player belongs to the n-th slot.
 */
export function buildLineup(slots: Slot[], roster: RosterPlayer[]): LineupRow[] {
  const active = roster.filter((p) => p.status === "Active");
  const rows: LineupRow[] = [];
  let i = 0;
  for (const { pos, count } of slots) {
    for (let n = 1; n <= count; n++) {
      const slot = `${pos}${n}`;
      rows.push({
        slot,
        actual: active[i] ?? null,
        perfect: roster.find((p) => p.perfect === slot) ?? null,
      });
      i++;
    }
  }
  return rows;
}

export function lineupTotals(roster: RosterPlayer[]) {
  const sum = (players: RosterPlayer[]) => players.reduce((total, p) => total + p.points, 0);
  return {
    actual: sum(roster.filter((p) => p.status === "Active")),
    perfect: sum(roster.filter((p) => p.perfect !== null)),
  };
}
