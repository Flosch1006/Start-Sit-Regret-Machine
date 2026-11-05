import type { Game } from "./types";

export type Outcome = "win" | "loss" | "";

export function outcome(mine: number | null, theirs: number | null): Outcome {
  if (mine === null || theirs === null || mine === theirs) return "";
  return mine > theirs ? "win" : "loss";
}

/** Winner of a pairing of scores: "home", "away" or null for a tie / missing score. */
function winner(home: number | null, away: number | null): "home" | "away" | null {
  const o = outcome(home, away);
  return o === "win" ? "home" : o === "loss" ? "away" : null;
}

export const actualWinner = (g: Game) => winner(g.home.actual, g.away.actual);
export const perfectWinner = (g: Game) => winner(g.home.perfect, g.away.perfect);

/** True when perfect lineups on both sides would have changed who won. */
export function flips(g: Game): boolean {
  const a = actualWinner(g);
  const p = perfectWinner(g);
  return a !== null && p !== null && a !== p;
}

const benched = (side: { actual: number | null; perfect: number | null }) =>
  side.actual === null || side.perfect === null ? 0 : Math.max(0, side.perfect - side.actual);

export const benchPoints = (g: Game) => benched(g.home) + benched(g.away);
