export interface Slot {
  pos: string;
  count: number;
}

export interface LeagueMeta {
  key: string;
  shortName: string;
  weeks: number;
  regSeasonEnd: number;
  slots: Slot[];
}

export interface SeasonMeta {
  season: number;
  leagues: LeagueMeta[];
}

export interface Index {
  /** newest season first; only seasons with scraped weeks */
  seasons: SeasonMeta[];
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  emoji: string | null;
}

export interface Side {
  id: string;
  name: string;
  shortName: string;
  actual: number | null;
  perfect: number | null;
}

export interface Game {
  period: number;
  home: Side;
  away: Side;
}

export interface LeagueData {
  teams: Team[];
  games: Game[];
}

export interface RosterPlayer {
  status: string;
  team: string;
  player: string;
  positions: string[];
  points: number;
  perfect: string | null;
}

/** All rosters of one week, keyed by team short name. */
export type WeekRosters = Record<string, RosterPlayer[]>;
