import json
import requests
import re
import os
import pandas as pd
from bs4 import BeautifulSoup
from datetime import date
from season import weeks

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")

# define functions to get teams
def get_teams(league_id):
    # define header information to pass to api request
    headers = {
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'text/plain',
        'Referer': f'https://www.fantrax.com/fantasy/league/{league_id}/standings',
        'sec-ch-ua-mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"Windows"',
    }

    # define parameter information to pass to api request
    params = {
        'leagueId': league_id,
    }

    # define data information to pass to api request
    data = {
        "msgs":[
            {
                "method": "getStandings",
                "data": {
                    "leagueId": league_id,
                    "reload": "1"
                }
            }
        ],
        "ng2": True,
        "refUrl": f"https://www.fantrax.com/fantasy/league/{league_id}/standings",
        "dt": 0,
        "at": 0,
        "av": None,
        "tz": "Europe/Berlin",
        "v": "73.0.0"}

    # execute api request
    response = requests.post('https://www.fantrax.com/fxpa/req', params=params, headers=headers, data=str(data))

    # convert response to soup
    soup = BeautifulSoup(response.content, "html.parser")

    # convert soup to json string
    json_string = soup.text

    # convert json string to dict
    df = json.loads(json_string)

    # extract team data
    teams = df["responses"][0]["data"]["fantasyTeamInfo"]

    # Convert into more readible dict
    teams = [{**value, "id": key} for key, value in teams.items()]

    return teams


def fantrax_cookies():
    """Session cookies of a logged-in Fantrax account.

    They are read from the FANTRAX_COOKIES environment variable in the format
    of a browser Cookie header ("name=value; name2=value2") and never stored in the code.
    """
    raw = os.environ.get("FANTRAX_COOKIES", "").strip()
    if not raw:
        raise RuntimeError(
            "FANTRAX_COOKIES is not set. Copy the Cookie header of a logged-in "
            "fantrax.com request into this environment variable."
        )
    return dict(
        part.strip().split("=", 1) for part in raw.split(";") if "=" in part
    )


# define function to get roster data
def get_roster(league_id, team_id, period):
    cookies = fantrax_cookies()

    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en-DE;q=0.9,en;q=0.8,de-DE;q=0.7,de;q=0.6',
        'Connection': 'keep-alive',
        'Referer': f'https://www.fantrax.com/fantasy/league/{league_id}/team/roster;teamId={team_id};seasonOrProjection=SEASON_23d_BY_PERIOD;timeframeTypeCode=BY_PERIOD;period=1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
    }

    response = requests.post(
        f"https://www.fantrax.com/fxpa/req?leagueId={league_id}",
        cookies=cookies,
        headers=headers,
        data=str({
            "msgs":[
                {
                    "method": "getTeamRosterInfo",
                     "data": {
                         "leagueId": league_id,
                         "teamId": team_id,
                         "period": period
                     }
                 }
            ],
            "uiv": 3,
            "refUrl": f"https://www.fantrax.com/fantasy/league/{league_id}/team/roster;teamId={team_id};period={period}",
            "dt": 0,
            "at": 0,
            "av": "0.0",
            "tz": "Europe/Berlin",
            "v": "167.0.1"
        })
    )

    # define stati
    status_ids = {
        "1": "Active",
        "2": "Bench",
        "3": "IR",
        "9": "Taxi"
    }

    # convert response to json
    data = response.json()

    scorings = []

    # extract scoring data
    for entry in data["responses"][0]["data"]["tables"]:
        col_names = [col["name"] for col in entry["header"]["cells"]]

        # iterate over players
        for player in entry["rows"]:
            if "scorer" in player.keys():
                contents = [cell["content"] for cell in player["cells"]]
                player_scorings = pd.Series(contents, index=col_names)
                info = pd.Series(player["scorer"])
                info.posShortNames = re.sub(r"<.*?>", "", info.posShortNames).split(",")
                status = pd.Series(status_ids[player["statusId"]], index=["status"])
                temp = pd.concat([status, info, player_scorings])

                if player["statusId"] in ["1", "2"]:
                    scorings.append(temp)

    # convert scorings to df
    scorings = pd.DataFrame(scorings)

    # keep relevant columns
    scorings = scorings[[
        "status", "teamShortName", "shortName", "posShortNames", "Fantasy Points"
    ]]

    # edit colnames
    scorings = scorings.rename(columns={
        "teamShortName": "team",
        "shortName": "player",
        "posShortNames": "positions",
        "Fantasy Points": "points"
    })

    # convert points to float
    scorings["points"] = pd.to_numeric(scorings["points"])

    # assign flex positions
    for index, player in scorings.iterrows():

        eligible = player.positions
        flex = []

        if "QB" in eligible:
            flex += ["QWRT"]
        if "RB" in eligible or "WR" in eligible or "TE" in eligible:
            flex += ["RWT", "QWRT"]
        if "CB" in eligible or "S" in eligible:
            flex += ["DB"]
        if (
                "DE" in eligible or "DL" in eligible or "DT" in eligible
                or "LB" in eligible or "CB" in eligible or "S" in eligible
                or "ER" in eligible
        ):
            flex += ["ID"]

        positions = list(set(eligible + flex))

        scorings.at[index, "positions"] = positions

    return scorings


# define function to get schedule data
def get_schedule(league_id):
    # define header information to pass to api request
    headers = {
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'text/plain',
        'Referer': f'https://www.fantrax.com/fantasy/league/{league_id}/standings',
        'sec-ch-ua-mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"Windows"',
    }

    # define parameter information to pass to api request
    params = {
        'leagueId': league_id,
    }

    # define data information to pass to api request
    data = {
        "msgs":[
            {
                "method": "getStandings",
                "data": {
                    "leagueId": league_id,
                    "view": "SCHEDULE"
                }
            }
        ],
        "ng2": True,
        "refUrl": f"https://www.fantrax.com/fantasy/league/{league_id}/standings",
        "dt": 0,
        "at": 0,
        "av": None,
        "tz": "Europe/Berlin",
        "v": "73.0.0"}

    # execute api request
    response = requests.post('https://www.fantrax.com/fxpa/req', params=params, headers=headers, data=str(data))

    # convert response to soup
    soup = BeautifulSoup(response.content, "html.parser")

    # convert soup to json string
    json_string = soup.text

    # convert json string to dict
    json_raw = json.loads(json_string)

    # create list to store matchups
    matchup_list = []

    # iterate over periods
    for period, matchups in enumerate(json_raw["responses"][0]["data"]["tableList"]):

        # iterate over matches in period
        for matchup in matchups["rows"]:

            # get home team
            home_team_name = matchup["cells"][0]["content"]
            home_team_id = matchup["cells"][0]["teamId"]

            # get away team
            away_team_name = matchup["cells"][2]["content"]
            away_team_id = matchup["cells"][2]["teamId"]

            # append to list
            matchup_list.append({
                "period": period + 1,
                "home_team_id": home_team_id,
                "home_team_name": home_team_name,
                "away_team_id": away_team_id,
                "away_team_name": away_team_name
            })

    return matchup_list


# read league data
with open(os.path.join(DATA_DIR, "leagues.json"), "r") as f:
    league_data = json.load(f)


# get data for specific week
def load_data(league: dict, period:int):

    # get schedule
    schedule = get_schedule(league["id"])

    # save schedule
    with open(os.path.join(DATA_DIR, league["short_name"], "schedule.json"), "w") as f:
        json.dump(schedule, f, indent=4)

    # get fantrax team data
    teams = get_teams(league["id"])

    # save team data
    with open(os.path.join(DATA_DIR, league["short_name"], "teams.json"), "w") as f:
        json.dump(teams, f, indent=4)

    # iterate over teams
    for team in teams:

        # get fantrax period data
        roster = get_roster(league_id=league["id"], team_id=team["id"], period=period)

        # save period data
        with open(os.path.join(DATA_DIR, league["short_name"], "rosters", f"{team['shortName']}_{period}.json"), "w") as f:
            json.dump(roster.to_dict(orient="records"), f, indent=4)



# get current week
today = date.today()
current_week = None
for week, start in weeks.items():
    if today >= start:
        current_week = int(week)

# compare against scraping results
if current_week:
    for name, league in league_data.items():
        if current_week > league["scraper_progress"]:
            for period in range(league["scraper_progress"] + 1, current_week + 1):
                print(f"Get Data for {league['short_name']} - Week {period}")
                # run scraper
                load_data(league, period)
                # update progress
                with open(os.path.join(DATA_DIR, "leagues.json"), "r") as f:
                    update = json.load(f)
                update[name]["scraper_progress"] = current_week
                with open(os.path.join(DATA_DIR, "leagues.json"), "w") as f:
                    json.dump(update, f, indent=4)
        else:
            print("League: ", league["short_name"])
            print("Current week:", current_week)
            print("Scraper progress for league:", league["scraper_progress"])