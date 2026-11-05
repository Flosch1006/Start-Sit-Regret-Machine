import { describe, expect, it } from "vitest";
import { benchPoints, flips, outcome } from "./results";
import type { Game } from "./types";

const side = (actual: number | null, perfect: number | null) => ({
  id: "x",
  name: "Team",
  shortName: "T",
  actual,
  perfect,
});

const game = (h: [number | null, number | null], a: [number | null, number | null]): Game => ({
  period: 1,
  home: side(...h),
  away: side(...a),
});

describe("outcome", () => {
  it("handles wins, losses, ties and missing scores", () => {
    expect(outcome(2, 1)).toBe("win");
    expect(outcome(1, 2)).toBe("loss");
    expect(outcome(1, 1)).toBe("");
    expect(outcome(null, 1)).toBe("");
  });
});

describe("flips", () => {
  it("is true when the perfect lineups change the winner", () => {
    expect(flips(game([100, 130], [110, 120]))).toBe(true);
  });

  it("is false when the winner stays the same", () => {
    expect(flips(game([120, 140], [100, 130]))).toBe(false);
  });

  it("is false for ties and missing scores", () => {
    expect(flips(game([100, 130], [100, 120]))).toBe(false);
    expect(flips(game([null, null], [100, 120]))).toBe(false);
  });
});

describe("benchPoints", () => {
  it("adds up what both sides left on the bench", () => {
    expect(benchPoints(game([100, 130], [110, 120]))).toBe(40);
  });
});
