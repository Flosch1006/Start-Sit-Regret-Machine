import { useMemo } from "react";
import { fmt, loadWeek } from "../lib/data";
import { buildLineup, lineupTotals } from "../lib/lineups";
import { useAsync } from "../lib/useAsync";
import type { LeagueData, LeagueMeta, RosterPlayer, Side } from "../lib/types";

interface Props {
  data: LeagueData;
  league: LeagueMeta;
  week: number;
  match: number;
  onMatch: (index: number) => void;
}

const nickname = (name: string) => name.split(" ").at(-1) ?? name;
const label = (p: RosterPlayer | null) => (p ? `${p.player} (${p.points})` : "–");

interface LineupProps {
  side: Side;
  roster: RosterPlayer[] | undefined;
  league: LeagueMeta;
  week: number;
  emoji: string;
}

function TeamLineup({ side, roster, league, week, emoji }: LineupProps) {
  if (!roster) {
    return (
      <section className="lineup">
        <h3 className="team-title">
          <span aria-hidden="true">{emoji}</span> {nickname(side.name)}
        </h3>
        <p className="empty">No lineup was saved for this team in week {week}.</p>
      </section>
    );
  }

  const rows = buildLineup(league.slots, roster);
  const totals = lineupTotals(roster);

  return (
    <section className="lineup" aria-label={side.name}>
      <h3 className="team-title">
        <span aria-hidden="true">{emoji}</span> {nickname(side.name)}
      </h3>
      <p className="totals">
        {fmt(totals.actual)} scored, {fmt(totals.perfect)} with a perfect lineup
      </p>
      <div className="table-wrap">
        <table className="roster">
          <thead>
            <tr>
              <th scope="col">Position</th>
              <th scope="col">Actual player</th>
              <th scope="col">Perfect player</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slot}>
                <th scope="row">{r.slot}</th>
                {/* red: started but not in the perfect lineup */}
                <td className={r.actual ? (r.actual.perfect !== null ? "keep" : "bad") : ""}>{label(r.actual)}</td>
                {/* yellow: should have started, was on the bench */}
                <td className={r.perfect ? (r.perfect.status === "Active" ? "keep" : "missed") : ""}>{label(r.perfect)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Matchups({ data, league, week, match, onMatch }: Props) {
  const games = useMemo(() => data.games.filter((g) => g.period === week), [data.games, week]);
  const rosters = useAsync(() => loadWeek(league.shortName, week), [league.shortName, week]);
  const emoji = (shortName: string) => data.teams.find((t) => t.shortName === shortName)?.emoji ?? "";

  if (games.length === 0) {
    return <p className="empty">No games are scheduled in week {week}. Pick an earlier week to compare lineups.</p>;
  }

  const index = Math.min(match, games.length - 1);
  const game = games[index];

  return (
    <>
      <div className="field match-picker">
        <label htmlFor="match">Matchup</label>
        <select id="match" value={index} onChange={(e) => onMatch(Number(e.target.value))}>
          {games.map((g, i) => (
            <option key={`${g.home.id}-${g.away.id}`} value={i}>
              {nickname(g.home.name)} vs {nickname(g.away.name)}
            </option>
          ))}
        </select>
      </div>

      <h2 className="headline">
        {nickname(game.home.name)} vs {nickname(game.away.name)}
      </h2>

      {rosters.error && <p className="empty" role="alert">{rosters.error.message}</p>}
      {rosters.loading && <p className="empty">Loading lineups…</p>}
      {rosters.data && (
        <div className="lineups">
          <TeamLineup side={game.home} roster={rosters.data[game.home.shortName]} league={league} week={week} emoji={emoji(game.home.shortName)} />
          <TeamLineup side={game.away} roster={rosters.data[game.away.shortName]} league={league} week={week} emoji={emoji(game.away.shortName)} />
        </div>
      )}
    </>
  );
}
