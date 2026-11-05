import { useCallback, useEffect, useState } from "react";

export const VIEWS = ["standings", "schedule", "matchups"] as const;
export type View = (typeof VIEWS)[number];

/** Everything the address bar remembers, so a link opens the same league, week and matchup. */
export interface Route {
  view: View;
  league: string | null;
  week: number | null;
  match: number;
}

export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  const week = Number(params.get("week"));
  const match = Number(params.get("match"));
  return {
    view: VIEWS.find((v) => v === path) ?? "standings",
    league: params.get("league"),
    week: Number.isInteger(week) && week > 0 ? week : null,
    match: Number.isInteger(match) && match > 0 ? match : 0,
  };
}

export function buildHash(route: Route): string {
  const params = new URLSearchParams();
  if (route.league) params.set("league", route.league);
  if (route.week) params.set("week", String(route.week));
  if (route.view === "matchups" && route.match > 0) params.set("match", String(route.match));
  const query = params.toString();
  return `#/${route.view}${query ? `?${query}` : ""}`;
}

export function useRoute(): [Route, (patch: Partial<Route>, replace?: boolean) => void] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback(
    (patch: Partial<Route>, replace = false) => {
      const hash = buildHash({ ...route, ...patch });
      if (replace) {
        // dragging the week slider should not fill the browser history
        window.history.replaceState(null, "", hash);
        setRoute(parseHash(hash));
      } else {
        window.location.hash = hash;
      }
    },
    [route],
  );

  return [route, navigate];
}
