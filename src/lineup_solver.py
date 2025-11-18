import json
import pandas as pd
from datetime import date

# read league data
with open("../data/leagues.json", "r") as f:
    league_data = json.load(f)

# define league weeks
weeks = {
    "1": date(2025, 9, 10),
    "2": date(2025, 9, 17),
    "3": date(2025, 9, 24),
    "4": date(2025, 10, 1),
    "5": date(2025, 10, 8),
    "6": date(2025, 10, 15),
    "7": date(2025, 10, 22),
    "8": date(2025, 10, 29),
    "9": date(2025, 11, 5),
    "10": date(2025, 11, 12),
    "11": date(2025, 11, 19),
    "12": date(2025, 11, 26),
    "13": date(2025, 12, 3),
    "14": date(2025, 12, 10),
    "15": date(2025, 12, 17),
    "16": date(2025, 12, 24),
    "17": date(2025, 12, 31),
}

# get current week
today = date.today()
current_week = None
for week, start in weeks.items():
    if today > start:
        current_week = int(week)

# iterate over leagues
for league in league_data.values():

    # compile path
    path = f"../data/{league['short_name']}"

    # read team data
    with open(f"{path}/teams.json", "r") as f:
        teams = json.load(f)

    # iterate over period
    for period in range(1,current_week + 1):

        period_summaries = []

        # iterate over teams
        for team in teams:

            # read period data
            with open(f"../data/{league['short_name']}/rosters/{team['shortName']}_{period}.json", "r") as f:
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
            with open(f"{path}/periods/period_{period}.json", "w") as f:
                json.dump(period_summaries, f, indent=4)

            # update roster
            with open(f"{path}/rosters/{team['shortName']}_{period}.json", "w") as f:
                json.dump(roster.to_dict(orient="records"), f, indent=4)