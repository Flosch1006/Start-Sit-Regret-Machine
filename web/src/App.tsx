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

  const league = index.leagues.find((l) => l.shortName === route.league) ?? index.leagues[0];
  const week = Math.min(Math.max(route.week ?? league.weeks, 1), league.weeks);
  const data = useAsync(() => loadLeague(league.shortName), [league.shortName]);

  const hashFor = (view: View) => buildHash({ view, league: league.shortName, week, match: 0 });

  return (
    <div className="shell">
      <header className="top">
        <h1 className="title">Start/Sit Regret Machine</h1>
        <Controls
          leagues={index.leagues}
          league={league}
          week={week}
          onLeague={(shortName) => {
            const next = index.leagues.find((l) => l.shortName === shortName) ?? league;
            navigate({ league: next.shortName, week: Math.min(week, next.weeks), match: 0 });
          }}
          onWeek={(next) => navigate({ league: league.shortName, week: next, match: 0 }, true)}
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
            league={league}
            week={week}
            match={route.match}
            onMatch={(match) => navigate({ league: league.shortName, week, match }, true)}
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
  return <Shell index={index.data} />;
}
