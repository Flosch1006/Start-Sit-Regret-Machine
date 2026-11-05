import { describe, expect, it } from "vitest";
import { computeTotals, unitOf } from "./totals";
import type { RosterPlayer, WeekRosters } from "./types";

const p = (status: string, points: number, perfect: string | null): RosterPlayer => ({
  status,
  team: "XX",
  player: "P",
  positions: [],
  points,
  perfect,
});

const week1: WeekRosters = {
  AAA: [p("Active", 10, "QB1"), p("Active", 4, null), p("Bench", 20, "DT1"), p("Active", 3, "K1")],
};
const week2: WeekRosters = {
  AAA: [p("Active", 5, "SFX1"), p("Bench", 6, "LB1")],
  BBB: [p("Active", 7, "RB1")],
};

describe("unitOf", () => {
  it("sorts slots into offense, defense and kicker", () => {
    expect(unitOf("RWT2")).toBe("offense");
    expect(unitOf("SFX1")).toBe("offense");
    expect(unitOf("QWRT1")).toBe("offense");
    expect(unitOf("DT1")).toBe("defense");
    expect(unitOf("ID1")).toBe("defense");
    expect(unitOf("K1")).toBe("kicker");
  });
});

describe("computeTotals", () => {
  const rows = computeTotals([week1, week2]);
  const aaa = rows.find((r) => r.shortName === "AAA");

  it("adds the perfect lineups of all weeks by unit", () => {
    expect(aaa?.perfect).toEqual({ total: 44, offense: 15, defense: 26, kicker: 3 });
  });

  it("adds the points of the started players", () => {
    expect(aaa?.actual).toBe(22);
  });

  it("counts the weeks a team has a lineup", () => {
    expect(aaa?.games).toBe(2);
    expect(rows.find((r) => r.shortName === "BBB")?.games).toBe(1);
  });

  it("units add up to the total", () => {
    for (const r of rows) {
      expect(r.perfect.offense + r.perfect.defense + r.perfect.kicker).toBeCloseTo(r.perfect.total, 2);
    }
  });
});
