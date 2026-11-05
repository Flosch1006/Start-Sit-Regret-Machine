import { useMemo } from "react";
import { TeamLogo } from "../components/TeamLogo";
import { TeamName } from "../components/TeamName";
import { fmt } from "../lib/data";
import { benchPoints, flips, outcome } from "../lib/results";
import { buildHash } from "../lib/route";
import type { Game, LeagueData, Side, Team } from "../lib/types";

interface Props {
  data: LeagueData;
  season: number;
  league: string;
  week: number;
}

const score = (n: number | null) => (n === null ? "–" : fmt(n));

interface RowProps {
  side: Side;
  other: Side;
  team: Team | undefined;
}

function TeamRow({ side, other, team }: RowProps) {
  const result = outcome(side.actual, other.actual);
  return (
    <div className={`score-row ${result}`}>
      <span className="score-team">
        <TeamLogo team={team} size={56} />
        <TeamName name={side.name} shortName={side.shortName} />
      </span>
      <span className="score-actual num">{score(side.actual)}</span>
      <span className="score-perfect num" title="Score with a perfect lineup">
        {score(side.perfect)}
      </span>
    </div>
  );
}

export function Schedule({ data, season, league, week }: Props) {
  const teams = useMemo(() => new Map(data.teams.map((t) => [t.shortName, t])), [data.teams]);

  const weeks = useMemo(() => {
    const byWeek = new Map<number, Game[]>();
    for (const g of data.games) {
      if (g.period > week) continue;
      byWeek.set(g.period, [...(byWeek.get(g.period) ?? []), g]);
    }
    return [...byWeek.entries()].sort((a, b) => b[0] - a[0]);
  }, [data.games, week]);

  if (weeks.length === 0) {
    return <p className="empty">No games are scheduled up to this week.</p>;
  }

  return (
    <>
      <p className="legend">
        <span className="legend-key">
          <strong>White</strong> actual score
        </span>
        <span className="legend-key">
          <span className="swatch swatch-bench" aria-hidden="true" /> score with a perfect lineup
        </span>
        <span className="legend-key">
          <span className="flip-badge" aria-hidden="true">Flipped</span> the perfect lineups would have changed the winner
        </span>
      </p>

      {weeks.map(([period, games]) => {
        const flipped = games.filter(flips).length;
        const bench = games.reduce((sum, g) => sum + benchPoints(g), 0);
        return (
          <section key={period} aria-labelledby={`week-${period}`} className="week-block">
            <div className="week-head">
              <h2 id={`week-${period}`} className="section-title">
                Week {period}
              </h2>
              <p className="week-sum">
                {flipped === 0 ? "No result" : flipped === 1 ? "1 result" : `${flipped} results`} would have flipped ·{" "}
                {fmt(bench)} points left on the bench
              </p>
            </div>
            <ul className="scoreboard">
              {games.map((g) => (
                <li key={`${g.home.id}-${g.away.id}`}>
                  <a
                    className={`score-card ${flips(g) ? "is-flipped" : ""}`}
                    href={buildHash({
                      view: "matchups",
                      season,
                      league,
                      week: period,
                      match: games.indexOf(g),
                    })}
                    aria-label={`${g.home.name} vs ${g.away.name}, week ${period}. Open lineups.`}
                  >
                    <TeamRow side={g.home} other={g.away} team={teams.get(g.home.shortName)} />
                    <TeamRow side={g.away} other={g.home} team={teams.get(g.away.shortName)} />
                    {flips(g) && <span className="flip-badge">Flipped</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
