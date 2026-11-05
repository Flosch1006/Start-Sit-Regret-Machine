import { useMemo } from "react";
import { fmt } from "../lib/data";
import type { Game, LeagueData } from "../lib/types";

interface Props {
  data: LeagueData;
  week: number;
}

type Outcome = "win" | "loss" | "";

function outcome(mine: number | null, theirs: number | null): Outcome {
  if (mine === null || theirs === null || mine === theirs) return "";
  return mine > theirs ? "win" : "loss";
}

const score = (n: number | null) => (n === null ? "–" : fmt(n));

export function Schedule({ data, week }: Props) {
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
      {weeks.map(([period, games]) => (
        <section key={period} aria-labelledby={`week-${period}`} className="week-block">
          <h2 id={`week-${period}`} className="section-title">
            Week {period}
          </h2>
          <div className="table-wrap">
            <table className="schedule">
              <thead>
                <tr>
                  <th scope="col" rowSpan={2}>Home</th>
                  <th scope="col" rowSpan={2}>Away</th>
                  <th scope="colgroup" colSpan={2} className="group">Actual score</th>
                  <th scope="colgroup" colSpan={2} className="group">Perfect lineup score</th>
                </tr>
                <tr>
                  <th scope="col" className="num">Home</th>
                  <th scope="col" className="num">Away</th>
                  <th scope="col" className="num">Home</th>
                  <th scope="col" className="num">Away</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={`${g.home.id}-${g.away.id}`}>
                    <th scope="row" className="team">{g.home.name}</th>
                    <td>{g.away.name}</td>
                    <td className={`num ${outcome(g.home.actual, g.away.actual)}`}>{score(g.home.actual)}</td>
                    <td className={`num ${outcome(g.away.actual, g.home.actual)}`}>{score(g.away.actual)}</td>
                    <td className={`num ${outcome(g.home.perfect, g.away.perfect)}`}>{score(g.home.perfect)}</td>
                    <td className={`num ${outcome(g.away.perfect, g.home.perfect)}`}>{score(g.away.perfect)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
