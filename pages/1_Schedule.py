import streamlit as st
import pandas as pd
from src.data_loader import load_schedule, load_teams, load_leagues, load_team_performances

st.set_page_config(page_title="League Schedule", page_icon="🏈")

st.title("League Schedule")

# load leagues
leagues = load_leagues()

# league selector
league_name = st.sidebar.selectbox("Select League", list(leagues.keys()))
league_info = leagues[league_name]

# week selector
week = st.sidebar.slider("Select Week", 1, league_info["scraper_progress"], league_info["scraper_progress"])

# load teams and schedule
teams = load_teams(league_info["short_name"])
schedule = load_schedule(league_info["short_name"])

# filter up to selected week
schedule = schedule[schedule["period"] <= week]

# load period data
performance_data = []
for period in range(1,week+1):
    performance_data.append(load_team_performances(league_info["short_name"], period))
performance_data = pd.concat(performance_data)

# join schedule with teams and performance data
schedule = schedule.merge(
    teams[["id", "shortName"]],
    left_on="home_team_id",
    right_on="id"
).rename(columns={"shortName": "home_team_short_name"})
schedule = schedule.merge(
    teams[["id", "shortName"]],
    left_on="away_team_id",
    right_on="id"
).rename(columns={"shortName": "away_team_short_name"})
schedule = schedule.merge(
    performance_data[["Team", "period", "actual", "perfect"]],
    how="left",
    left_on=["home_team_short_name", "period"],
    right_on=["Team", "period"]
).rename(columns={"actual": "home_actual", "perfect": "home_perfect"})
schedule = schedule.merge(
    performance_data[["Team", "period", "actual", "perfect"]],
    how="left",
    left_on=["away_team_short_name", "period"],
    right_on=["Team", "period"]
).rename(columns={"actual": "away_actual", "perfect": "away_perfect"})

schedule = schedule[[
    "period", "home_team_name", "home_actual", "home_perfect",
    "away_perfect", "away_actual", "away_team_name"
]].rename(
    columns={
        "home_actual": "Home Actual",
        "away_actual": "Away Actual",
        "home_team_name": "Home Team",
        "away_team_name": "Away Team",
        "home_perfect": "Home Perfect",
        "away_perfect": "Away Perfect",
    }
)

# create a dictionary of DataFrames, one per week
weekly_schedules = {
    week_num: df for week_num, df in schedule.groupby("period")
}

for week_num in sorted(weekly_schedules.keys(), reverse=True):
    st.subheader(f"Week {week_num}")
    df = weekly_schedules[week_num].reset_index()[[
        "Home Actual", "Away Actual",
        "Home Team", "Away Team",
        "Home Perfect", "Away Perfect",
    ]]

    # define styling function
    def highlight_winner(row):
        styles = [""] * len(row)
        if row["Home Actual"] > row["Away Actual"]:
            styles[df.columns.get_loc("Home Actual")] = "background-color: #106900"
            styles[df.columns.get_loc("Away Actual")] = "background-color: #690000"
        elif row["Away Actual"] > row["Home Actual"]:
            styles[df.columns.get_loc("Away Actual")] = "background-color: #106900"
            styles[df.columns.get_loc("Home Actual")] = "background-color: #690000"
        if row["Home Perfect"] > row["Away Perfect"]:
            styles[df.columns.get_loc("Home Perfect")] = "background-color: #106900"
            styles[df.columns.get_loc("Away Perfect")] = "background-color: #690000"
        elif row["Away Perfect"] > row["Home Perfect"]:
            styles[df.columns.get_loc("Away Perfect")] = "background-color: #106900"
            styles[df.columns.get_loc("Home Perfect")] = "background-color: #690000"
        return styles

    # format numbers
    df["Home Actual"] = df["Home Actual"].map("{:.2f}".format)
    df["Away Actual"] = df["Away Actual"].map("{:.2f}".format)
    df["Home Perfect"] = df["Home Perfect"].map("{:.2f}".format)
    df["Away Perfect"] = df["Away Perfect"].map("{:.2f}".format)

    # apply Styler
    styled_df = df.style.apply(highlight_winner, axis=1)

    # show styled table
    st.dataframe(styled_df, hide_index=True)