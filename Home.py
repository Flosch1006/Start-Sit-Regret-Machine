import streamlit as st
import altair as alt
import pandas as pd
from src.data_loader import load_teams, load_schedule, load_team_performances, load_leagues

# set app title
st.set_page_config(page_title="Home", page_icon="🏈")
st.title("Start/Sit Regret Machine")

# load leagues
leagues = load_leagues()

# add league selector
league_name = st.sidebar.selectbox("Select League", list(leagues.keys()))
league_info = leagues[league_name]

# add week selector
week = st.sidebar.slider("Select Week", 1, league_info["scraper_progress"], league_info["scraper_progress"])

# Load teams and schedule
teams = load_teams(league_info["short_name"])
schedule = load_schedule(league_info["short_name"])

# Filter up to selected week
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
]]

# calculate result
results = schedule.copy()
results["home_result_actual"] = results["home_actual"] > results["away_actual"]
results["home_result_perfect"] = results["home_perfect"] > results["away_perfect"]
results["away_result_actual"] = results["away_actual"] > results["home_actual"]
results["away_result_perfect"] = results["away_perfect"] > results["home_perfect"]

# calculate standings
home = results[[
    "period", "home_team_name", "home_actual", "home_perfect",
    "away_actual", "away_perfect", "home_result_actual", "home_result_perfect"
]].rename(columns={
    "home_team_name": "team",
    "home_actual": "actual_points",
    "home_perfect": "perfect_points",
    "away_actual": "opp_actual_points",
    "away_perfect": "opp_perfect_points",
    "home_result_actual": "win_actual",
    "home_result_perfect": "win_perfect"
})

away = results[[
    "period", "away_team_name", "away_actual", "away_perfect",
    "home_actual", "home_perfect", "away_result_actual", "away_result_perfect"
]].rename(columns={
    "away_team_name": "team",
    "away_actual": "actual_points",
    "away_perfect": "perfect_points",
    "home_actual": "opp_actual_points",
    "home_perfect": "opp_perfect_points",
    "away_result_actual": "win_actual",
    "away_result_perfect": "win_perfect"
})
results = pd.concat([home, away], ignore_index=True)
results = results.groupby(["team"]).agg({
    "win_actual": "sum",
    "actual_points": "sum",
    "opp_actual_points": "sum",
    "win_perfect": "sum",
    "perfect_points": "sum",
    "opp_perfect_points": "sum"
})
results["loss_actual"] = week - results["win_actual"]
results["loss_perfect"] = week - results["win_perfect"]
results = results[[
    "win_perfect",
    "loss_perfect",
    "perfect_points",
    "opp_perfect_points",
    "win_actual",
    "loss_actual",
    "actual_points",
    "opp_actual_points",
]].sort_values(["win_perfect", "perfect_points"], ascending=False)

# calculate deltas
results["delta_points"] = (results["perfect_points"] - results["actual_points"]) / week
chart = alt.Chart(
    results.sort_values(["win_perfect", "perfect_points"], ascending=False).reset_index()[["team", "delta_points"]]).mark_bar().encode(
    x=alt.X("delta_points:Q", title="Points Lost vs Perfect Lineup"),
    y=alt.Y("team:N", sort=None, title="Team"),
    color=alt.Color("team:N", legend=None)
)

# display standings
st.subheader(f"Standings after Week {week}")

# add record cols
results["record_perfect"] = results["win_perfect"].astype(str) + "-" + results["loss_perfect"].astype(str)
results["record_actual"] = results["win_actual"].astype(str) + "-" + results["loss_actual"].astype(str)

results = results.reset_index(drop=False).rename(
    columns={
        "team": "Team",
        "record_perfect": "Perfect Record",
        "record_actual": "Actual Record",
        "perfect_points": "Perfect Points",
        "actual_points": "Actual Points",
        "delta_points": "Delta Points",
    }
)
st.dataframe(
    results[[
        "Team",
        "Perfect Record",
        "Actual Record",
        "Perfect Points",
        "Actual Points",
        "Delta Points",
    ]],
    hide_index=True,
    height=results.shape[0]*league_info["result_height"]
)

# display deltas
st.subheader(f"Avg Team Delta vs Perfect Lineup after Week {week}")
st.altair_chart(chart, width="stretch")

# team_choice = st.sidebar.selectbox("Select Team", )


# deltas = load_team_deltas(league_info["short_name"], week)
# st.subheader(f"Team delta vs perfect lineup — Week {week}")
# st.dataframe(deltas)
#
# schedule = load_schedule(league_info["short_name"])
# week_schedule = schedule[schedule["period"] == week]
#
# st.subheader(f"Schedule — Week {week}")
# st.table(week_schedule[["home_team_name", "away_team_name"]])
#
# week_data = load_week_data(league_info["short_name"], week)
#
# team_roster = week_data
#
# st.subheader(f"Week {week} lineup")
# st.dataframe(team_roster[["player", "positions", "points", "perfect"]])