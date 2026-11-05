import type { Game, Side } from "./types";

export interface StandingRow {
  team: string;
  games: number;
  winPerfect: number;
  lossPerfect: number;
  perfectPoints: number;
  oppPerfectPoints: number;
  winActual: number;
  lossActual: number;
  actualPoints: number;
  oppActualPoints: number;
  /** average points left on the bench per played week */
  deltaPerWeek: number;
}

const beats = (a: number | null, b: number | null) => a !== null && b !== null && a > b;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Standings after `week`, counting every team's real result and the result it
 * would have had with a perfect lineup. Ordered by perfect wins, then perfect points.
 *
 * Losses and the weekly average use the games a team actually played. The old
 * Streamlit app used the selected week number instead, which was off by one
 * for weeks without a scheduled game (e.g. week 15, after the regular season).
 */
export function computeStandings(games: Game[], week: number): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  const row = (team: string): StandingRow => {
    let r = rows.get(team);
    if (!r) {
      r = {
        team,
        games: 0,
        winPerfect: 0,
        lossPerfect: 0,
        perfectPoints: 0,
        oppPerfectPoints: 0,
        winActual: 0,
        lossActual: 0,
        actualPoints: 0,
        oppActualPoints: 0,
        deltaPerWeek: 0,
      };
      rows.set(team, r);
    }
    return r;
  };

  const add = (me: Side, opp: Side) => {
    const r = row(me.name);
    r.actualPoints += me.actual ?? 0;
    r.perfectPoints += me.perfect ?? 0;
    r.oppActualPoints += opp.actual ?? 0;
    r.oppPerfectPoints += opp.perfect ?? 0;
    if (me.actual !== null && opp.actual !== null) {
      r.games += 1;
      if (beats(me.actual, opp.actual)) r.winActual += 1;
      else r.lossActual += 1;
      if (beats(me.perfect, opp.perfect)) r.winPerfect += 1;
      else r.lossPerfect += 1;
    }
  };

  for (const g of games) {
    if (g.period > week) continue;
    add(g.home, g.away);
    add(g.away, g.home);
  }

  const result = [...rows.values()].sort((a, b) => (a.team < b.team ? -1 : a.team > b.team ? 1 : 0));
  for (const r of result) {
    r.deltaPerWeek = r.games > 0 ? round2((r.perfectPoints - r.actualPoints) / r.games) : 0;
  }
  // Array.sort is stable, so equal teams keep their alphabetical order
  return result.sort((a, b) => b.winPerfect - a.winPerfect || b.perfectPoints - a.perfectPoints);
}
