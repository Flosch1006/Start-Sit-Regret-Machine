import type { LeagueMeta } from "../lib/types";

interface Props {
  leagues: LeagueMeta[];
  league: LeagueMeta;
  week: number;
  onLeague: (shortName: string) => void;
  onWeek: (week: number) => void;
}

export function Controls({ leagues, league, week, onLeague, onWeek }: Props) {
  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="league">League</label>
        <select id="league" value={league.shortName} onChange={(e) => onLeague(e.target.value)}>
          {leagues.map((l) => (
            <option key={l.shortName} value={l.shortName}>
              {l.key}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="week">Week</label>
        <div className="stepper">
          <button type="button" aria-label="Previous week" disabled={week <= 1} onClick={() => onWeek(week - 1)}>
            −
          </button>
          <input
            id="week"
            type="range"
            min={1}
            max={league.weeks}
            value={week}
            onChange={(e) => onWeek(Number(e.target.value))}
          />
          <button type="button" aria-label="Next week" disabled={week >= league.weeks} onClick={() => onWeek(week + 1)}>
            +
          </button>
          <output htmlFor="week">{week}</output>
        </div>
      </div>
    </div>
  );
}
