"""League weeks of the current NFL season.

A week counts as finished on the Tuesday after its last game, which is when
the scraper and the lineup solver pick it up. Week 1 of 2026 is played from
Wednesday 9 September to Monday 14 September 2026.
"""
from datetime import date, timedelta

SEASON = 2026
FIRST_TUESDAY = date(2026, 9, 15)
NUMBER_OF_WEEKS = 17

weeks = {
    str(n): FIRST_TUESDAY + timedelta(weeks=n - 1)
    for n in range(1, NUMBER_OF_WEEKS + 1)
}
