import type { Index, LeagueData, WeekRosters } from "./types";

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  let request = cache.get(path) as Promise<T> | undefined;
  if (!request) {
    request = fetch(`${import.meta.env.BASE_URL}data/${path}`).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
      return res.json() as Promise<T>;
    });
    cache.set(path, request);
    // a failed request must not stay cached, so reloading the page retries it
    request.catch(() => cache.delete(path));
  }
  return request;
}

export const loadIndex = () => load<Index>("index.json");
export const loadLeague = (season: number, shortName: string) => load<LeagueData>(`${season}/${shortName}/league.json`);
export const loadWeek = (season: number, shortName: string, week: number) =>
  load<WeekRosters>(`${season}/${shortName}/week-${week}.json`);

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
