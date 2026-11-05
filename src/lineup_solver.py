import json
import os
import pandas as pd
from datetime import date
from season import SEASON, weeks

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data", str(SEASON))

# read league data
with open(os.path.join(DATA_DIR, "leagues.json"), "r") as f:
    league_data = json.load(f)

# get current week
today = date.today()
current_week = None
for week, start in weeks.items():
    if today >= start:
        current_week = int(week)

# iterate over leagues
for league in league_data.values():

    # only weeks the scraper has loaded so far
    last_week = min(current_week or 0, league["scraper_progress"])
    if last_week == 0:
        print(f"League {league['short_name']}: no scraped weeks for season {SEASON} yet, skipped")
        continue

    # compile path
    path = os.path.join(DATA_DIR, league['short_name'])

    # read team data
    with open(os.path.join(path, "teams.json"), "r") as f:
        teams = json.load(f)

    # iterate over period
    for period in range(1, last_week + 1):

        period_summaries = []

        # iterate over teams
        for team in teams:

            # read period data
            with open(os.path.join(DATA_DIR, league['short_name'], "rosters", f"{team['shortName']}_{period}.json"), "r") as f:
                roster_json = json.load(f)

            # convert roster to dataframe
            roster = pd.DataFrame(roster_json)

            # calculate perfect lineup
            roster["perfect"] = None

            # create copy of roster
            roster_copy = roster.copy()

            # iterate over positions
            for pos, count in league["roster"].items():
                for i in range(1, count + 1):
                    # filter for eligible players
                    players = roster_copy[roster_copy['positions'].apply(lambda x: pos in x)]

                    # get player with most points
                    player_index = players[players["points"] == players["points"].max()].index[0]

                    # set perfect position
                    roster.at[player_index, "perfect"] = f"{pos}{i}"

                    # remove player from potential players
                    roster_copy = roster_copy[roster_copy.index != player_index]

            # save result
            actual = roster[roster.status == "Active"].points.sum()
            perfect = roster[roster.perfect.notnull()].points.sum()

            period_summaries.append(
                {
                    "Team": team["shortName"],
                    "period": f"Week {period}",
                    "actual": round(actual, 2),
                    "perfect": round(perfect, 2),
                    "delta": round(perfect - actual, 2)
                }
            )

            # save period data
            with open(os.path.join(path, "periods", f"period_{period}.json"), "w") as f:
                json.dump(period_summaries, f, indent=4)

            # update roster
            with open(os.path.join(path, "rosters", f"{team['shortName']}_{period}.json"), "w") as f:
                json.dump(roster.to_dict(orient="records"), f, indent=4)