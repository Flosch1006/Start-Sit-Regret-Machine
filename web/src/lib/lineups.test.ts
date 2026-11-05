import { describe, expect, it } from "vitest";
import { buildChanges, lineupTotals, perfectLineup, slotName } from "./lineups";
import type { RosterPlayer } from "./types";

const p = (player: string, status: string, points: number, perfect: string | null, positions: string[]): RosterPlayer => ({
  status,
  team: "XX",
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

describe("buildChanges", () => {
  it("lists who should have sat and who should have started, unpaired", () => {
    const { sat, started } = buildChanges(roster);
    expect(sat.map((x) => x.player)).toEqual(["Starter RB A"]);
    expect(started.map((x) => x.player)).toEqual(["Bench RB"]);
  });

  it("sorts the players who sat by lowest score and the ones who should start by highest", () => {
    const many = [
      p("Bad", "Active", 0, null, ["WR"]),
      p("Worse", "Active", -1, null, ["WR"]),
      p("Good", "Bench", 9, "WR1", ["WR"]),
      p("Great", "Bench", 14, "WR2", ["WR"]),
    ];
    const { sat, started } = buildChanges(many);
    expect(sat.map((x) => x.player)).toEqual(["Worse", "Bad"]);
    expect(started.map((x) => x.player)).toEqual(["Great", "Good"]);
  });

  it("totals add up to the points left on the bench", () => {
    const { satPoints, startedPoints } = buildChanges(roster);
    const totals = lineupTotals(roster);
    expect(startedPoints - satPoints).toBe(totals.perfect - totals.actual);
  });

  it("returns nothing for an already perfect lineup", () => {
    const { sat, started } = buildChanges(roster.slice(0, 1));
    expect(sat).toEqual([]);
    expect(started).toEqual([]);
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
    expect(slotName("K1")).toBe("K");
  });
});
