// Turns the scraped JSON in ../data/<season> into the small files the frontend loads.
// Pure Node, no dependencies, so it also runs on the hosting build machine.
// A season only shows up on the site once at least one of its leagues has scraped weeks.
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../data");
const outDir = path.resolve(here, "../public/data");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};

// season folders are named by year, newest first
const seasonNames = (await readdir(dataDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
  .map((d) => d.name)
  .sort()
  .reverse();

await rm(outDir, { recursive: true, force: true });

const seasons = [];
let rosterFiles = 0;

for (const season of seasonNames) {
  const leagues = await readJson(path.join(dataDir, season, "leagues.json"));
  const metas = [];

  for (const [key, cfg] of Object.entries(leagues)) {
    const short = cfg.short_name;
    const weeks = cfg.scraper_progress;
    if (!weeks) continue; // nothing scraped yet

    const leagueDir = path.join(dataDir, season, short);
    const target = path.join(outDir, season, short);

    const teams = await readJson(path.join(leagueDir, "teams.json"));
    const schedule = await readJson(path.join(leagueDir, "schedule.json"));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    // weekly scores per team: "<shortName>|<week>" -> { actual, perfect }
    const scores = new Map();
    for (let week = 1; week <= weeks; week++) {
      const rows = await readJson(path.join(leagueDir, "periods", `period_${week}.json`));
      for (const row of rows) scores.set(`${row.Team}|${week}`, { actual: row.actual, perfect: row.perfect });
    }

    const side = (id, period) => {
      const team = teamById.get(id);
      if (!team) throw new Error(`${season} ${key}: schedule references unknown team id ${id}`);
      const score = scores.get(`${team.shortName}|${period}`);
      return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        actual: score?.actual ?? null,
        perfect: score?.perfect ?? null,
      };
    };

    const games = schedule
      .filter((g) => g.period <= weeks)
      .map((g) => ({ period: g.period, home: side(g.home_team_id, g.period), away: side(g.away_team_id, g.period) }));

    await writeJson(path.join(target, "league.json"), {
      teams: teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, emoji: t.emoji ?? null })),
      games,
    });

    // one rosters file per week, so the matchup view only loads the week it shows
    for (let week = 1; week <= weeks; week++) {
      const byTeam = {};
      for (const team of teams) {
        try {
          byTeam[team.shortName] = await readJson(path.join(leagueDir, "rosters", `${team.shortName}_${week}.json`));
          rosterFiles++;
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
          console.warn(`warning: no roster for ${season} ${key} ${team.shortName} week ${week}`);
        }
      }
      await writeJson(path.join(target, `week-${week}.json`), byTeam);
    }

    metas.push({
      key,
      shortName: short,
      weeks,
      regSeasonEnd: cfg.reg_season_end,
      slots: Object.entries(cfg.roster).map(([pos, count]) => ({ pos, count })),
    });
  }

  if (metas.length) seasons.push({ season: Number(season), leagues: metas });
}

await writeJson(path.join(outDir, "index.json"), { seasons });
console.log(
  `data: ${seasons.length} season(s) [${seasons.map((s) => s.season).join(", ")}], ${rosterFiles} roster files -> ${path.relative(process.cwd(), outDir)}`,
);
