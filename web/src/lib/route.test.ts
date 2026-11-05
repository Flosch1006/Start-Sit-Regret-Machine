import { describe, expect, it } from "vitest";
import { buildHash, parseHash } from "./route";

describe("route hash", () => {
  it("reads season, league, week and matchup from a link", () => {
    expect(parseHash("#/matchups?season=2025&league=dldafg&week=9&match=2")).toEqual({
      view: "matchups",
      season: 2025,
      league: "dldafg",
      week: 9,
      match: 2,
    });
  });

  it("falls back to the standings and ignores nonsense values", () => {
    expect(parseHash("")).toEqual({ view: "standings", season: null, league: null, week: null, match: 0 });
    expect(parseHash("#/nope?season=abc&week=-3&match=1.5").season).toBeNull();
    expect(parseHash("#/nope?season=abc&week=-3&match=1.5")).toMatchObject({ view: "standings", week: null, match: 0 });
  });

  it("writes the same values back", () => {
    const route = parseHash("#/schedule?season=2026&league=dldafg&week=8");
    expect(buildHash(route)).toBe("#/schedule?season=2026&league=dldafg&week=8");
  });

  it("only keeps the matchup in the matchup view", () => {
    expect(buildHash({ view: "standings", season: 2025, league: "dldafg", week: 3, match: 4 })).toBe(
      "#/standings?season=2025&league=dldafg&week=3",
    );
  });
});
