import { describe, expect, it } from "vitest";
import { buildSwaps, lineupTotals, perfectLineup } from "./lineups";
import type { RosterPlayer } from "./types";

const p = (player: string, status: string, points: number, perfect: string | null, positions: string[], team = "XX"): RosterPlayer => ({
  status,
  team,
  player,
  positions,
  points,
  perfect,
});

const slots = [
  { pos: "QB", count: 1 },
  { pos: "RB", count: 2 },
];

const roster = [
  p("Starter QB", "Active", 10, "QB1", ["QB"]),
  p("Starter RB A", "Active", 2, null, ["RB"]),
  p("Starter RB B", "Active", 12, "RB2", ["RB"]),
  p("Bench RB", "Bench", 20, "RB1", ["RB"]),
];

describe("buildSwaps", () => {
  it("pairs a started player who should have sat with the one who should have started", () => {
    const { swaps, extras } = buildSwaps(roster);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].sit.player).toBe("Starter RB A");
    expect(swaps[0].start.player).toBe("Bench RB");
    expect(swaps[0].gain).toBe(18);
    expect(extras).toHaveLength(0);
  });

  it("matches positions before points", () => {
    const mixed = [
      p("Weak WR", "Active", 1, null, ["WR"]),
      p("Weak RB", "Active", 3, null, ["RB"]),
      p("Bench RB", "Bench", 15, "RB1", ["RB"]),
      p("Bench WR", "Bench", 9, "WR1", ["WR"]),
    ];
    const { swaps } = buildSwaps(mixed);
    expect(swaps.map((s) => [s.sit.player, s.start.player])).toEqual([
      ["Weak RB", "Bench RB"],
      ["Weak WR", "Bench WR"],
    ]);
  });

  it("gains add up to the points left on the bench", () => {
    const { swaps } = buildSwaps(roster);
    const totals = lineupTotals(roster);
    expect(swaps.reduce((sum, s) => sum + s.gain, 0)).toBe(totals.perfect - totals.actual);
  });

  it("sets aside the second row of a two-way player", () => {
    const twoWay = [
      p("Hunter", "Active", 1.5, null, ["WR", "CB"], "JAX"),
      p("Hunter", "Active", 2, "CB1", ["WR", "CB"], "JAX"),
      p("Weak WR", "Active", 1, null, ["WR"]),
      p("Bench WR", "Bench", 9, "WR1", ["WR"]),
    ];
    const { swaps, extras } = buildSwaps(twoWay);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].sit.player).toBe("Weak WR");
    expect(extras.map((e) => e.player)).toEqual(["Hunter"]);
  });

  it("returns nothing for an already perfect lineup", () => {
    expect(buildSwaps(roster.slice(0, 1)).swaps).toEqual([]);
  });
});

describe("perfectLineup", () => {
  it("lists the perfect player of each slot, also from the bench", () => {
    const rows = perfectLineup(slots, roster);
    expect(rows.map((r) => r.slot)).toEqual(["QB1", "RB1", "RB2"]);
    expect(rows.map((r) => r.player?.player)).toEqual(["Starter QB", "Bench RB", "Starter RB B"]);
  });

  it("leaves a cell empty instead of failing when data is missing", () => {
    expect(perfectLineup(slots, roster.slice(0, 1))[1].player).toBeNull();
  });
});

describe("lineupTotals", () => {
  it("sums the started and the perfect lineup", () => {
    expect(lineupTotals(roster)).toEqual({ actual: 24, perfect: 42 });
  });
});
