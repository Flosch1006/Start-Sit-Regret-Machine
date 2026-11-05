import { useMemo } from "react";
import { TeamLogo } from "../components/TeamLogo";
import { fmt } from "../lib/data";
import { computeStandings } from "../lib/standings";
import type { LeagueData } from "../lib/types";

interface Props {
  data: LeagueData;
  week: number;
}

export function Standings({ data, week }: Props) {
  const rows = useMemo(() => computeStandings(data.games, week), [data.games, week]);
  const teams = useMemo(() => new Map(data.teams.map((t) => [t.name, t])), [data.teams]);

  if (rows.length === 0) {
    return <p className="empty">No games have been played in this league yet. Pick a later week.</p>;
  }

  // the bars share one scale: the best perfect-lineup average in the league
  const maxPerfect = Math.max(...rows.map((r) => r.perfectPoints / Math.max(r.games, 1)));
  const worst = rows.reduce((a, b) => (b.deltaPerWeek > a.deltaPerWeek ? b : a));
  const leagueTotal = rows.reduce((sum, r) => sum + (r.perfectPoints - r.actualPoints), 0);

  return (
    <>
      <section aria-labelledby="headline">
        <h2 id="headline" className="headline">
          <TeamLogo team={teams.get(worst.team)} size={72} /> {worst.team} left {fmt(worst.deltaPerWeek)} points on the bench every week.
        </h2>
        <p className="lede">
          Together the league left {fmt(leagueTotal)} points unused through week {week}.
        </p>
        <p className="legend">
          <span className="swatch swatch-scored" aria-hidden="true" /> Points scored
          <span className="swatch swatch-bench" aria-hidden="true" /> Points left on the bench
        </p>
      </section>

      <div className="table-wrap">
        <table className="standings">
          <caption className="sr-only">Standings after week {week}</caption>
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col" className="num">Perfect record</th>
              <th scope="col" className="num">Actual record</th>
              <th scope="col" className="num pts">Perfect points</th>
              <th scope="col" className="num pts">Actual points</th>
              <th scope="col" className="bench-col">
                Per week
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const games = Math.max(r.games, 1);
              const scored = r.actualPoints / games;
              const scale = (n: number) => `${Math.max(0, (n / maxPerfect) * 100)}%`;
              return (
                <tr key={r.team}>
                  <th scope="row" className="team">
                    <span className="team-cell">
                      <TeamLogo team={teams.get(r.team)} />
                      <span>{r.team}</span>
                    </span>
                  </th>
                  <td className="num">
                    {r.winPerfect}-{r.lossPerfect}
                  </td>
                  <td className="num">
                    {r.winActual}-{r.lossActual}
                  </td>
                  <td className="num pts">{fmt(r.perfectPoints)}</td>
                  <td className="num pts">{fmt(r.actualPoints)}</td>
                  <td className="bench-col">
                    <div className="bench">
                      <div
                        className="split"
                        role="img"
                        aria-label={`${fmt(scored)} points scored and ${fmt(r.deltaPerWeek)} left on the bench per week`}
                      >
                        <span className="split-scored" style={{ width: scale(scored) }} />
                        <span className="split-bench" style={{ width: scale(r.deltaPerWeek) }} />
                      </div>
                      <span className="num bench-value">{fmt(r.deltaPerWeek)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
