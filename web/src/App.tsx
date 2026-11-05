import { Controls } from "./components/Controls";
import { loadIndex, loadLeague } from "./lib/data";
import { buildHash, useRoute, VIEWS, type View } from "./lib/route";
import type { Index } from "./lib/types";
import { useAsync } from "./lib/useAsync";
import { Matchups } from "./views/Matchups";
import { Schedule } from "./views/Schedule";
import { Standings } from "./views/Standings";

const VIEW_LABEL: Record<View, string> = {
  standings: "Standings",
  schedule: "Schedule",
  matchups: "Matchups",
};

function Shell({ index }: { index: Index }) {
  const [route, navigate] = useRoute();

  const seasonMeta = index.seasons.find((s) => s.season === route.season) ?? index.seasons[0];
  const season = seasonMeta.season;
  const league = seasonMeta.leagues.find((l) => l.shortName === route.league) ?? seasonMeta.leagues[0];
  const week = Math.min(Math.max(route.week ?? league.weeks, 1), league.weeks);
  const data = useAsync(() => loadLeague(season, league.shortName), [season, league.shortName]);

  const hashFor = (view: View) => buildHash({ view, season, league: league.shortName, week, match: 0 });

  return (
    <div className="shell">
      <header className="top">
        <h1 className="title">Start/Sit Regret Machine</h1>
        <Controls
          seasons={index.seasons.map((s) => s.season)}
          season={season}
          onSeason={(next) => {
            const nextMeta = index.seasons.find((s) => s.season === next) ?? seasonMeta;
            const nextLeague = nextMeta.leagues.find((l) => l.shortName === league.shortName) ?? nextMeta.leagues[0];
            // a new season opens on its latest week
            navigate({ season: nextMeta.season, league: nextLeague.shortName, week: null, match: 0 });
          }}
          leagues={seasonMeta.leagues}
          league={league}
          week={week}
          onLeague={(shortName) => {
            const next = seasonMeta.leagues.find((l) => l.shortName === shortName) ?? league;
            navigate({ season, league: next.shortName, week: Math.min(week, next.weeks), match: 0 });
          }}
          onWeek={(next) => navigate({ season, league: league.shortName, week: next, match: 0 }, true)}
        />
      </header>

      <nav className="tabs" aria-label="Views">
        {VIEWS.map((v) => (
          <a key={v} href={hashFor(v)} aria-current={route.view === v ? "page" : undefined}>
            {VIEW_LABEL[v]}
          </a>
        ))}
      </nav>

      <main>
        {data.error && (
          <p className="empty" role="alert">
            {data.error.message}. Reload the page to try again.
          </p>
        )}
        {data.loading && <p className="empty">Loading league data…</p>}
        {data.data && route.view === "standings" && <Standings data={data.data} week={week} />}
        {data.data && route.view === "schedule" && <Schedule data={data.data} week={week} />}
        {data.data && route.view === "matchups" && (
          <Matchups
            data={data.data}
            season={season}
            league={league}
            week={week}
            match={route.match}
            onMatch={(match) => navigate({ season, league: league.shortName, week, match }, true)}
          />
        )}
      </main>

      <footer className="foot">Scores come from Fantrax.</footer>
    </div>
  );
}

export default function App() {
  const index = useAsync(loadIndex, []);

  if (index.error) {
    return (
      <div className="shell">
        <p className="empty" role="alert">
          {index.error.message}. Reload the page to try again.
        </p>
      </div>
    );
  }
  if (!index.data) {
    return (
      <div className="shell">
        <p className="empty">Loading…</p>
      </div>
    );
  }
  if (index.data.seasons.length === 0) {
    return (
      <div className="shell">
        <h1 className="title">Start/Sit Regret Machine</h1>
        <p className="empty">No league data has been scraped yet. Run the scraper and the solver, then publish the new files in data/.</p>
      </div>
    );
  }
  return <Shell index={index.data} />;
}
