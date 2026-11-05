import { describe, expect, it } from "vitest";
import { buildSwaps, lineupTotals, perfectLineup, slotName } from "./lineups";
import type { RosterPlayer } from "./types";

const p = (
  player: string,
  status: string,
  points: number,
  perfect: string | null,
  positions: string[],
  slot?: string,
  team = "XX",
): RosterPlayer => ({ status, team, player, positions, points, perfect, slot });

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

const FLEX = ["RWT", "SFX", "QWRT"];

describe("buildSwaps", () => {
  it("pairs a started player who should have sat with the one who should have started", () => {
    const { swaps, extras } = buildSwaps(roster);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].sit.player).toBe("Starter RB A");
    expect(swaps[0].start.player).toBe("Bench RB");
    expect(swaps[0].gain).toBe(18);
    expect(swaps[0].slot).toBe("RB");
    expect(extras).toHaveLength(0);
  });

  it("swaps the player of the same slot first, then fills the flex slot (Titans, week 8)", () => {
    const titans = [
      p("Allen", "Active", 9, null, ["DT", "ID"], "DT"),
      p("Baun", "Active", 9, null, ["ID", "LB"], "ID"),
      p("Barnes", "Active", 1, null, ["ID", "LB"], "LB"),
      p("J. Meyers", "Active", 3.4, null, ["WR", ...FLEX], "WR"),
      p("Rodgers", "Active", 6.6, null, ["QB", ...FLEX], "SFX"),
      p("Reichard", "Active", 1, null, ["K"], "K"),
      p("Heyward", "Bench", 30.48, "DT1", ["DT", "ID"]),
      p("Jacas", "Bench", 16.3, "ID1", ["ER", "ID"]),
      p("Gainwell", "Bench", 15, "RB1", ["RB", ...FLEX]),
      p("D. Meyers", "Bench", 12.4, "WR2", ["WR", ...FLEX]),
      p("Spillane", "Bench", 12, "LB2", ["ID", "LB"]),
      p("Borregales", "Bench", 6, "K1", ["K"]),
    ];
    const { swaps } = buildSwaps(titans);
    const pairs = Object.fromEntries(swaps.map((s) => [s.start.player, [s.sit.player, s.slot]]));
    expect(pairs).toEqual({
      Heyward: ["Allen", "DT"],
      Jacas: ["Baun", "ID"],
      Gainwell: ["Rodgers", "SFX"],
      "D. Meyers": ["J. Meyers", "WR"],
      Spillane: ["Barnes", "LB"],
      Borregales: ["Reichard", "K"],
    });
  });

  it("keeps leftovers inside their family and shows where the new player plays (DFT, week 7)", () => {
    const week7 = [
      p("Henry", "Active", 5.4, null, ["RB", ...FLEX], "RB"),
      p("Bynum", "Active", 2.5, null, ["ID", "S", "DB"], "S"),
      p("Kamara", "Bench", 9.7, "RWT2", ["RB", ...FLEX]),
      p("Heyward", "Bench", 8, "ID1", ["ID", "DT"]),
    ];
    const { swaps } = buildSwaps(week7);
    const pairs = Object.fromEntries(swaps.map((s) => [s.start.player, [s.sit.player, s.slot]]));
    expect(pairs).toEqual({ Kamara: ["Henry", "RB"], Heyward: ["Bynum", "ID"] });
  });

  it("falls back to eligibility when the data has no slots", () => {
    const old = [
      p("Weak WR", "Active", 1, null, ["WR"]),
      p("Weak RB", "Active", 3, null, ["RB"]),
      p("Bench RB", "Bench", 15, "RB1", ["RB"]),
      p("Bench WR", "Bench", 9, "WR1", ["WR"]),
    ];
    const { swaps } = buildSwaps(old);
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
      p("Hunter", "Active", 1.5, null, ["WR", "CB"], "WR", "JAX"),
      p("Hunter", "Active", 2, "CB1", ["WR", "CB"], "CB", "JAX"),
      p("Weak WR", "Active", 1, null, ["WR"], "WR"),
      p("Bench WR", "Bench", 9, "WR1", ["WR"]),
    ];
    const { swaps, extras } = buildSwaps(twoWay);
    expect(swaps).toHaveLength(1);
    expect(extras).toHaveLength(1);
    expect(extras[0].player).toBe("Hunter");
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

describe("slotName", () => {
  it("drops the slot number", () => {
    expect(slotName("RWT2")).toBe("RWT");
  });
});
