import json
from pathlib import Path
import pandas as pd


def load_teams(league_short_name: str):
    with open(f"data/{league_short_name}/teams.json") as f:
        return pd.DataFrame(json.load(f))


def load_schedule(league_short_name: str):
    with open(f"data/{league_short_name}/schedule.json") as f:
        return pd.DataFrame(json.load(f))


def load_week_data(league_short_name: str, week: int, team_short_name: str):
    with open(f"data/{league_short_name}/rosters/{team_short_name}_{week}.json") as f:
        return pd.DataFrame(json.load(f))


def load_team_performances(league_short_name: str, week: int):
    with open(f"data/{league_short_name}/periods/period_{week}.json") as f:
        data = json.load(f)
        for performance in data:
            performance["period"] = week
        return pd.DataFrame(data)


def load_leagues():
    with open("data/leagues.json") as f:
        return json.load(f)


def load_roster(league_short_name: str, week: int, team_short_name: str):
    with open(f"data/{league_short_name}/rosters/{team_short_name}_{week}.json") as f:
        return pd.DataFrame(json.load(f))