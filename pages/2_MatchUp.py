from itertools import product

import streamlit as st
import pandas as pd
from src.data_loader import load_schedule, load_teams, load_leagues, load_roster

st.set_page_config(page_title="MatchUp Analysis", page_icon="🏈")

# load leagues
leagues = load_leagues()

# league selector
default_league = st.session_state.get("selected_league", list(leagues.keys())[0])
league_name = st.sidebar.selectbox("Select League", list(leagues.keys()), index=list(leagues.keys()).index(default_league))
st.session_state["selected_league"] = league_name
league_info = leagues[league_name]

# week selector
default_week = st.session_state.get("selected_week", league_info["scraper_progress"])
week = st.sidebar.slider("Select Week", 1, league_info["scraper_progress"], default_week)
st.session_state["selected_week"] = week

# load teams and schedule
teams = load_teams(league_info["short_name"])
schedule = load_schedule(league_info["short_name"])

# filter to selected week only
week_schedule = schedule[schedule["period"] == week]

# join to get readable team names
week_schedule = week_schedule.merge(
    teams[["id", "name"]],
    left_on="home_team_id",
    right_on="id"
).rename(columns={"name": "home_team"})
week_schedule = week_schedule.merge(
    teams[["id", "name"]],
    left_on="away_team_id",
    right_on="id"
).rename(columns={"name": "away_team"})

week_schedule["home_team"] = week_schedule["home_team"].str.split().str[-1]
week_schedule["away_team"] = week_schedule["away_team"].str.split().str[-1]

# create a label for the selectbox like "Home Team vs Away Team"
week_schedule["match_label"] = week_schedule["home_team"] + " vs " + week_schedule["away_team"]

# match selector on top
selected_match = st.selectbox(
    "Select Matchup",
    week_schedule["match_label"].tolist()
)

# get the selected match data
selected_row = week_schedule[week_schedule["match_label"] == selected_match].iloc[0]

# extract useful info
home_team = selected_row["home_team"]
away_team = selected_row["away_team"]

st.markdown(f"### 🏟️ {home_team} vs {away_team}")

# get team data
teams.set_index("id", inplace=True)
home_team_id = selected_row.home_team_id
away_team_id = selected_row.away_team_id
home_team_short_name = teams.at[home_team_id, "shortName"]
away_team_short_name = teams.at[away_team_id, "shortName"]

# load team performance data for the week
home_roster = load_roster(league_info["short_name"], week, home_team_short_name)
home_roster_frame = pd.DataFrame(columns=[
    "Position", "Actual Player", "Perfect Player"
])
counter = 0
for position, count in league_info["roster"].items():
    for i in range(count):
        home_roster_frame = pd.concat(
            [
                home_roster_frame,
                pd.DataFrame([
                    {
                        "Position": f"{position}{i+1}",
                        "Actual Player": f"{home_roster[home_roster.status == 'Active'].iloc[counter].player} ("
                                         f"{home_roster[home_roster.status == 'Active'].iloc[counter].points})",
                        "Perfect Player": f"{home_roster.loc[
                            home_roster['perfect'] == f'{position}{i + 1}', 'player'
                        ].values[0]} ("
                        f"{home_roster.loc[
                            home_roster['perfect'] == f'{position}{i + 1}', 'points'
                        ].values[0]})"
                    }
                ])
            ],
            axis=0
        )
        counter += 1
home_roster_frame.reset_index(inplace=True, drop=True)

away_roster = load_roster(league_info["short_name"], week, away_team_short_name)
away_roster_frame = pd.DataFrame(columns=[
    "Position", "Actual Player", "Perfect Player"
])
counter = 0
for position, count in league_info["roster"].items():
    for i in range(count):
        away_roster_frame = pd.concat(
            [
                away_roster_frame,
                pd.DataFrame([
                    {
                        "Position": f"{position}{i+1}",
                        "Actual Player": f"{away_roster[away_roster.status == 'Active'].iloc[counter].player} "
                                         f"({away_roster[away_roster.status == 'Active'].iloc[counter].points})",
                        "Perfect Player": f"{away_roster.loc[
                            away_roster['perfect'] == f'{position}{i + 1}', 'player'
                        ].values[0]} ("
                        f"{away_roster.loc[
                            away_roster['perfect'] == f'{position}{i + 1}', 'points'
                        ].values[0]})"
                    }
                ])
            ],
            axis=0
        )
        counter += 1
away_roster_frame.reset_index(inplace=True, drop=True)

def highlight_actual(df):
    def _highlight(row):
        styles = [''] * len(row)
        if row['Actual Player'] in df['Perfect Player'].values:
            styles[row.index.get_loc('Actual Player')] = 'background-color: #106900'  # green
        else:
            styles[row.index.get_loc('Actual Player')] = 'background-color: #690000'  # red
        if row['Perfect Player'] in df['Actual Player'].values:
            styles[row.index.get_loc('Perfect Player')] = 'background-color: #106900'  # green
        else:
            styles[row.index.get_loc('Perfect Player')] = 'background-color: #06109c'  # red
        return styles
    return df.style.apply(_highlight, axis=1)

# Apply the Styler
home_styled = highlight_actual(home_roster_frame)
away_styled = highlight_actual(away_roster_frame)

# Layout: two columns, use st.dataframe with full height
col1, col2 = st.columns(2)

with col1:
    st.subheader(f"🏠 {home_team}")
    st.dataframe(
        home_styled,
        hide_index=True,
        width=1200,
        height=home_roster_frame.shape[0]*league_info["matchup_df_height"],
    )

with col2:
    st.subheader(f"✈️ {away_team}")
    st.dataframe(
        away_styled,
        hide_index=True,
        width=1200,
        height=away_roster_frame.shape[0]*league_info["matchup_df_height"],
    )