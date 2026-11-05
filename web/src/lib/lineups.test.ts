import { describe, expect, it } from "vitest";
import { buildLineup, lineupTotals } from "./lineups";
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
  p("Bench RB", "Reserve", 20, "RB1", ["RB"]),
];

describe("buildLineup", () => {
  it("pairs the n-th active player with the n-th slot", () => {
    const rows = buildLineup(slots, roster);
    expect(rows.map((r) => r.slot)).toEqual(["QB1", "RB1", "RB2"]);
    expect(rows.map((r) => r.actual?.player)).toEqual(["Starter QB", "Starter RB A", "Starter RB B"]);
  });

  it("finds the perfect player of each slot, also from the bench", () => {
    const rows = buildLineup(slots, roster);
    expect(rows[1].perfect?.player).toBe("Bench RB");
    expect(rows[1].perfect?.status).toBe("Reserve");
  });

  it("leaves a cell empty instead of failing when data is missing", () => {
    const rows = buildLineup(slots, roster.slice(0, 1));
    expect(rows[1].actual).toBeNull();
    expect(rows[1].perfect).toBeNull();
  });
});

describe("lineupTotals", () => {
  it("sums the started and the perfect lineup", () => {
    expect(lineupTotals(roster)).toEqual({ actual: 24, perfect: 42 });
  });
});
