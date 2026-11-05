import { useMemo } from "react";
import { TeamLogo } from "../components/TeamLogo";
import { fmt, loadWeek } from "../lib/data";
import { buildChanges, lineupTotals, perfectLineup, slotName } from "../lib/lineups";
import { actualWinner, flips, perfectWinner } from "../lib/results";
import { useAsync } from "../lib/useAsync";
import type { Game, LeagueData, LeagueMeta, RosterPlayer, Side, Team } from "../lib/types";

interface Props {
  data: LeagueData;
  season: number;
  league: LeagueMeta;
  week: number;
  match: number;
  onMatch: (index: number) => void;
}

const nickname = (name: string) => name.split(" ").at(-1) ?? name;
const pts = (p: RosterPlayer) => fmt(p.points);

function verdict(g: Game): string {
  const a = actualWinner(g);
  const p = perfectWinner(g);
  const name = (w: "home" | "away") => nickname(g[w].name);
  if (a === null) return "This one ended level.";
  if (flips(g) && p) return `${name(a)} won, but with perfect lineups ${name(p)} would have.`;
  return `${name(a)} won, and perfect lineups would not have changed that.`;
}

interface LineupProps {
  side: Side;
  roster: RosterPlayer[] | undefined;
  league: LeagueMeta;
  week: number;
  team: Team | undefined;
}

function TeamLineup({ side, roster, league, week, team }: LineupProps) {
  const title = (
    <h3 className="team-title">
      <TeamLogo team={team} size={72} /> {nickname(side.name)}
    </h3>
  );
  if (!roster) {
    return (
      <section className="lineup">
        {title}
        <p className="empty">No lineup was saved for this team in week {week}.</p>
      </section>
    );
  }

  const changes = buildChanges(roster);
  const perfect = perfectLineup(league.slots, roster);
  const totals = lineupTotals(roster);
  const left = Math.max(0, totals.perfect - totals.actual);
  const scale = Math.max(totals.perfect, totals.actual, 1);
  const best = changes.started[0];

  return (
    <section className="lineup" aria-label={side.name}>
      {title}
      <div
        className="split split-lg"
        role="img"
        aria-label={`${fmt(totals.actual)} points scored and ${fmt(left)} left on the bench`}
      >
        <span className="split-scored" style={{ width: `${(totals.actual / scale) * 100}%` }} />
        <span className="split-bench" style={{ width: `${(left / scale) * 100}%` }} />
      </div>
      <p className="totals">
        <strong>{fmt(totals.actual)}</strong> scored · <strong>{fmt(left)}</strong> left on the bench
      </p>

      {best ? (
        <p className="callout">
          <span className="callout-label">Biggest miss</span>
          {best.player} ({pts(best)}) sat on the bench. In the perfect lineup he plays {slotName(best.perfect ?? "")}.
        </p>
      ) : (
        <p className="callout callout-ok">A perfect lineup. Nothing to regret.</p>
      )}

      {changes.started.length > 0 && (
        <>
          <ChangeTable
            title="Should have started"
            players={changes.started}
            total={changes.startedPoints}
            kind="start"
            slotOf={(p) => slotName(p.perfect ?? "")}
          />
          <ChangeTable
            title="Should have sat"
            players={changes.sat}
            total={changes.satPoints}
            kind="sit"
            slotOf={(p) => p.slot ?? undefined}
          />
          <p className="net">
            Net <strong>+{fmt(left)}</strong> points
          </p>
          <p className="note">
            Not paired one to one: the perfect lineup also moves players between flex slots.
          </p>
        </>
      )}

      <details className="perfect-lineup">
        <summary>Perfect lineup by slot</summary>
        <table className="roster">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Player</th>
              <th scope="col" className="num">Points</th>
            </tr>
          </thead>
          <tbody>
            {perfect.map((r) => (
              <tr key={r.slot}>
                <th scope="row">{r.slot}</th>
                <td>
                  {r.player ? r.player.player : "–"}
                  {r.player && r.player.status !== "Active" && <span className="tag-bench">was on bench</span>}
                </td>
                <td className="num">{r.player ? pts(r.player) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function ChangeTable({
  title,
  players,
  total,
  kind,
  slotOf,
}: {
  title: string;
  players: RosterPlayer[];
  total: number;
  kind: "start" | "sit";
  slotOf: (p: RosterPlayer) => string | undefined;
}) {
  return (
    <div className="table-wrap">
      <table className={`roster change change-${kind}`}>
        <caption className="change-title">{title}</caption>
        <tbody>
          {players.map((p, i) => (
            <tr key={`${p.player}-${i}`}>
              <td className="slot-cell">
                <span className="slot-tag">{slotOf(p) ?? ""}</span>
              </td>
              <td>{p.player}</td>
              <td className="num player-pts">{pts(p)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>Total</th>
            <td className="num">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function Matchups({ data, season, league, week, match, onMatch }: Props) {
  const games = useMemo(() => data.games.filter((g) => g.period === week), [data.games, week]);
  const rosters = useAsync(() => loadWeek(season, league.shortName, week), [season, league.shortName, week]);
  const team = (shortName: string) => data.teams.find((t) => t.shortName === shortName);

  if (games.length === 0) {
    return <p className="empty">No games are scheduled in week {week}. Pick an earlier week to compare lineups.</p>;
  }

  const index = Math.min(match, games.length - 1);
  const game = games[index];

  return (
    <>
      <nav className="match-list" aria-label={`Week ${week} matchups`}>
        {games.map((g, i) => (
          <button
            key={`${g.home.id}-${g.away.id}`}
            type="button"
            className={`match-chip ${flips(g) ? "is-flipped" : ""}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onMatch(i)}
          >
            <span>
              <TeamLogo team={team(g.home.shortName)} size={40} /> {g.home.shortName}
            </span>
            <span className="chip-vs">vs</span>
            <span>
              <TeamLogo team={team(g.away.shortName)} size={40} /> {g.away.shortName}
            </span>
            {flips(g) && <span className="flip-dot" title="Perfect lineups would flip this result" />}
          </button>
        ))}
      </nav>

      <section aria-label="Result" className="duel">
        <div className="duel-side">
          <span className="duel-team">
            <TeamLogo team={team(game.home.shortName)} size={64} /> {nickname(game.home.name)}
          </span>
          <span className="duel-score">{game.home.actual === null ? "–" : fmt(game.home.actual)}</span>
          <span className="duel-perfect">perfect {game.home.perfect === null ? "–" : fmt(game.home.perfect)}</span>
        </div>
        <span className="duel-vs" aria-hidden="true">vs</span>
        <div className="duel-side">
          <span className="duel-team">
            <TeamLogo team={team(game.away.shortName)} size={64} /> {nickname(game.away.name)}
          </span>
          <span className="duel-score">{game.away.actual === null ? "–" : fmt(game.away.actual)}</span>
          <span className="duel-perfect">perfect {game.away.perfect === null ? "–" : fmt(game.away.perfect)}</span>
        </div>
      </section>
      <p className={`verdict ${flips(game) ? "is-flipped" : ""}`}>{verdict(game)}</p>

      {rosters.error && <p className="empty" role="alert">{rosters.error.message}</p>}
      {rosters.loading && <p className="empty">Loading lineups…</p>}
      {rosters.data && (
        <div className="lineups">
          <TeamLineup side={game.home} roster={rosters.data[game.home.shortName]} league={league} week={week} team={team(game.home.shortName)} />
          <TeamLineup side={game.away} roster={rosters.data[game.away.shortName]} league={league} week={week} team={team(game.away.shortName)} />
        </div>
      )}
    </>
  );
}
