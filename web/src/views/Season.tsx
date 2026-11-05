import { useMemo, useState } from "react";
import { TeamLogo } from "../components/TeamLogo";
import { NameGroup, TeamName } from "../components/TeamName";
import { fmt, loadWeek } from "../lib/data";
import { computeTotals, type TotalsRow } from "../lib/totals";
import type { LeagueData, Team } from "../lib/types";
import { useAsync } from "../lib/useAsync";

interface Props {
  data: LeagueData;
  season: number;
  league: string;
  week: number;
}

type Key = "total" | "offense" | "defense" | "kicker" | "perGame" | "actual" | "bench";

const COLUMNS: { key: Key; label: string; best?: boolean }[] = [
  { key: "total", label: "Total", best: true },
  { key: "offense", label: "Offense", best: true },
  { key: "defense", label: "Defense", best: true },
  { key: "kicker", label: "Kicker", best: true },
  { key: "perGame", label: "Per week" },
  { key: "actual", label: "Actual" },
  { key: "bench", label: "On bench" },
];

function value(r: TotalsRow, key: Key): number {
  switch (key) {
    case "total":
      return r.perfect.total;
    case "offense":
      return r.perfect.offense;
    case "defense":
      return r.perfect.defense;
    case "kicker":
      return r.perfect.kicker;
    case "perGame":
      return r.games > 0 ? r.perfect.total / r.games : 0;
    case "actual":
      return r.actual;
    case "bench":
      return r.perfect.total - r.actual;
  }
}

interface BestProps {
  title: string;
  row: TotalsRow;
  team: Team | undefined;
  points: number;
}

function Best({ title, row, team, points }: BestProps) {
  return (
    <li className="best">
      <span className="best-title">{title}</span>
      <span className="best-team">
        <TeamLogo team={team} size={48} />
        <TeamName name={team?.name ?? row.shortName} shortName={row.shortName} />
      </span>
      <span className="best-points">{fmt(points)}</span>
    </li>
  );
}

export function Season({ data, season, league, week }: Props) {
  const weeks = useAsync(
    () => Promise.all(Array.from({ length: week }, (_, i) => loadWeek(season, league, i + 1))),
    [season, league, week],
  );
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "total", desc: true });

  const teams = useMemo(() => new Map(data.teams.map((t) => [t.shortName, t])), [data.teams]);
  const rows = useMemo(() => (weeks.data ? computeTotals(weeks.data) : []), [weeks.data]);

  if (weeks.error) {
    return <p className="empty" role="alert">{weeks.error.message}</p>;
  }
  if (weeks.loading) return <p className="empty">Loading all lineups of the season…</p>;
  if (rows.length === 0) return <p className="empty">No lineups have been saved up to this week.</p>;

  const best = (key: Key) => rows.reduce((a, b) => (value(b, key) > value(a, key) ? b : a));
  const top = { total: best("total"), offense: best("offense"), defense: best("defense") };
  const sorted = [...rows].sort((a, b) => (sort.desc ? 1 : -1) * (value(b, sort.key) - value(a, sort.key)));
  const maxOf = (key: Key) => Math.max(...rows.map((r) => value(r, key)));

  return (
    <NameGroup>
      <section aria-labelledby="best-heading">
        <h2 id="best-heading" className="headline">
          With perfect lineups through week {week}
        </h2>
        <ul className="best-list">
          <Best title="Best overall" row={top.total} team={teams.get(top.total.shortName)} points={top.total.perfect.total} />
          <Best title="Best offense" row={top.offense} team={teams.get(top.offense.shortName)} points={top.offense.perfect.offense} />
          <Best title="Best defense" row={top.defense} team={teams.get(top.defense.shortName)} points={top.defense.perfect.defense} />
        </ul>
      </section>

      <div className="table-wrap">
        <table className="totals-table">
          <caption className="sr-only">Season totals with perfect lineups after week {week}</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="num"
                  aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    className="sort"
                    onClick={() => setSort({ key: c.key, desc: sort.key === c.key ? !sort.desc : true })}
                  >
                    {c.label}
                    <span aria-hidden="true">{sort.key === c.key ? (sort.desc ? " ↓" : " ↑") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const team = teams.get(r.shortName);
              return (
                <tr key={r.shortName}>
                  <td className="rank">{i + 1}</td>
                  <th scope="row" className="team">
                    <span className="team-cell">
                      <TeamLogo team={team} />
                      <TeamName name={team?.name ?? r.shortName} shortName={r.shortName} />
                    </span>
                  </th>
                  {COLUMNS.map((c) => {
                    const v = value(r, c.key);
                    const isBest = c.best === true && v === maxOf(c.key);
                    return (
                      <td key={c.key} className={`num${isBest ? " is-best" : ""}`}>
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        Offense, defense and kicker count the players of the perfect lineup by the slot they would play. Per week is
        the perfect total divided by the weeks with a saved lineup; On bench is perfect minus actual.
      </p>
    </NameGroup>
  );
}
