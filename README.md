# Start-Sit-Regret-Machine
This is a fantasy football analytics app that helps Fantrax league managers confront the painful truth: how many points they left on the bench.  It scrapes your league data, calculates the absolute delta between actual and optimal lineups each week, and even simulates the “what if everyone set their best lineup” scenario.
## Static frontend (`web/`)

A static replacement for the Streamlit app: the same standings, schedule and matchup views as plain files, with no server to run.

- `web/scripts/build-data.mjs` turns the scraped JSON in `data/` into the small files the site loads (no dependencies, runs on the build machine).
- `web/` is a Vite + React + TypeScript app. The scraper and the lineup solver stay in Python and are untouched.

```bash
cd web
npm install
npm run dev      # local preview, rebuilds the data files first
npm test         # unit tests for standings and lineups
npm run build    # production build in web/dist
```

### Deploy on Cloudflare Pages

Connect this repository in Cloudflare Pages and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` (after merging this branch) |
| Build command | `cd web && npm ci && npm run build` |
| Build output directory | `web/dist` |

Then add the custom domain under *Custom domains*. Every push to the branch deploys a new version. After the scraper and solver have written new files to `data/`, commit and push them and the site updates itself.

## Scraper and solver

`src/scraper.py` loads teams, schedule and weekly rosters from Fantrax, `src/lineup_solver.py` computes the perfect lineups. Both work on one season at a time: the weeks and the season number come from `src/season.py`, the data lives in `data/<season>/` (`leagues.json` plus one folder per league). Finished seasons stay in their folder and show up in the season selector of the site.

The roster request needs a logged-in Fantrax session. Pass it as the environment variable `FANTRAX_COOKIES`: open fantrax.com while logged in, DevTools -> Network, click a request to `fxpa/req`, and copy the value of the `Cookie` request header. Never put it in the code. For the GitHub Action, store it as the repository secret `FANTRAX_COOKIES`.

```bash
export FANTRAX_COOKIES='name=value; name2=value2'
python src/scraper.py && python src/lineup_solver.py
```

The scraper only loads weeks beyond `scraper_progress` in `data/<season>/leagues.json`, so it can run every week and picks up where it stopped. Leagues without an `id` are skipped.

If the scraper stops with `STALE_CLIENT`, Fantrax has released a new web client: update `FANTRAX_CLIENT_VERSION` at the top of `src/scraper.py` (the field `v` of any request to `fxpa/req`).

### Starting a new season

1. In `src/season.py` set `SEASON` and `FIRST_TUESDAY` (the Tuesday after the last game of week 1).
2. Create `data/<season>/leagues.json` with the Fantrax league `id`, the lineup slots in the order Fantrax lists them (restrictive slots before flex slots), `reg_season_end` and `scraper_progress: 0`.
3. Run the scraper and the solver, commit `data/` and push. The site builds itself.

The old Streamlit app (`Home.py`, `pages/`) reads `data/` without a season folder and no longer works with this layout.
