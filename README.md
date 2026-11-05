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
