import { describe, expect, it } from "vitest";
import { computeStandings } from "./standings";
import type { Game, Side } from "./types";

const side = (name: string, actual: number | null, perfect: number | null): Side => ({
  id: name,
  name,
  shortName: name,
  actual,
  perfect,
});

const games: Game[] = [
  { period: 1, home: side("Aces", 100, 120), away: side("Bears", 90, 130) },
  { period: 2, home: side("Bears", 80, 100), away: side("Aces", 110, 111) },
  { period: 3, home: side("Aces", 50, 60), away: side("Bears", 40, 50) },
];

describe("computeStandings", () => {
  it("counts actual and perfect results separately", () => {
    const rows = computeStandings(games, 2);
    const aces = rows.find((r) => r.team === "Aces")!;
    const bears = rows.find((r) => r.team === "Bears")!;
    // actual: Aces win both weeks (100 > 90, 110 > 80)
    expect([aces.winActual, aces.lossActual]).toEqual([2, 0]);
    expect([bears.winActual, bears.lossActual]).toEqual([0, 2]);
    // perfect: Bears win week 1 (130 > 120), Aces win week 2 (111 > 100)
    expect([aces.winPerfect, aces.lossPerfect]).toEqual([1, 1]);
    expect([bears.winPerfect, bears.lossPerfect]).toEqual([1, 1]);
  });

  it("orders by perfect wins, then perfect points", () => {
    const rows = computeStandings(games, 2);
    // both 1-1 on perfect results; Aces 120+111=231 beat Bears 130+100=230
    expect(rows.map((r) => r.team)).toEqual(["Aces", "Bears"]);
  });

  it("averages over games played, not over the selected week", () => {
    const rows = computeStandings(games, 3);
    const aces = rows.find((r) => r.team === "Aces")!;
    expect(aces.games).toBe(3);
    // (120+111+60) - (100+110+50) = 31 over 3 games
    expect(aces.deltaPerWeek).toBe(10.33);
    expect(aces.winActual + aces.lossActual).toBe(3);
  });

  it("ignores weeks that have no game yet", () => {
    const rows = computeStandings(games.slice(0, 2), 15);
    expect(rows.every((r) => r.games === 2)).toBe(true);
    expect(rows.every((r) => r.winActual + r.lossActual === 2)).toBe(true);
  });

  it("does not crash on missing scores", () => {
    const rows = computeStandings([{ period: 1, home: side("Aces", null, null), away: side("Bears", 90, 100) }], 1);
    expect(rows.every((r) => r.games === 0 && r.winActual === 0 && r.deltaPerWeek === 0)).toBe(true);
  });
});
