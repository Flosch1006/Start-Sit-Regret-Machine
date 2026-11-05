import type { WeekRosters } from "./types";

export interface Split {
  total: number;
  offense: number;
  defense: number;
  kicker: number;
}

export interface TotalsRow {
  shortName: string;
  /** weeks with a saved lineup */
  games: number;
  /** points the perfect lineups scored, split by unit */
  perfect: Split;
  /** points the started lineups really scored */
  actual: number;
}

const OFFENSE = ["QB", "RB", "WR", "TE", "RWT", "SFX", "QWRT"];

/** Which unit a lineup slot belongs to: "RWT2" is offense, "K1" the kicker, everything else defense. */
export function unitOf(slot: string): "offense" | "defense" | "kicker" {
  const base = slot.replace(/\d+$/, "");
  if (base === "K") return "kicker";
  return OFFENSE.includes(base) ? "offense" : "defense";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Season totals per team over the given weeks, as if every lineup had been
 * perfect. The unit comes from the slot of the perfect lineup, so a two-way
 * player counts for the unit he would play in.
 */
export function computeTotals(weeks: WeekRosters[]): TotalsRow[] {
  const rows = new Map<string, TotalsRow>();

  for (const week of weeks) {
    for (const [shortName, roster] of Object.entries(week)) {
      let row = rows.get(shortName);
      if (!row) {
        row = { shortName, games: 0, perfect: { total: 0, offense: 0, defense: 0, kicker: 0 }, actual: 0 };
        rows.set(shortName, row);
      }
      row.games += 1;
      for (const p of roster) {
        if (p.status === "Active") row.actual += p.points;
        if (p.perfect !== null) {
          const unit = unitOf(p.perfect);
          row.perfect[unit] += p.points;
          row.perfect.total += p.points;
        }
      }
    }
  }

  return [...rows.values()].map((r) => ({
    ...r,
    actual: round2(r.actual),
    perfect: {
      total: round2(r.perfect.total),
      offense: round2(r.perfect.offense),
      defense: round2(r.perfect.defense),
      kicker: round2(r.perfect.kicker),
    },
  }));
}
