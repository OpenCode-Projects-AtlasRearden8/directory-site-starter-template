"""Date tests for the verified-free-on / recheck-on workflow.

This is the maintenance heartbeat of the template: every test failure here
tells you which card to re-verify and what to update.
"""

import datetime as dt
import re

import pytest

from helpers import DATA_URL, today

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_date(value):
    return dt.date.fromisoformat(value)


def test_all_dates_are_iso_calendar_dates():
    from helpers import load_data

    bad = []
    for card in load_data()["cards"]:
        for field in ("verified_free_on", "recheck_on"):
            value = card.get(field, "")
            if not ISO_RE.match(value):
                bad.append(f"{card['name']}: {field}={value!r} is not YYYY-MM-DD")
                continue
            try:
                parse_date(value)
            except ValueError:
                bad.append(f"{card['name']}: {field}={value!r} is not a real calendar date")
    assert not bad, "\n".join(bad)


def test_verified_free_on_not_in_future():
    from helpers import load_data

    stamp = today()
    future = [
        f"{c['name']} verifies free on {c['verified_free_on']} (after {stamp})"
        for c in load_data()["cards"]
        if c["verified_free_on"] > stamp
    ]
    assert not future, (
        "you cannot verify the future — bump the date back or wait:\n"
        + "\n".join(future)
    )


def test_recheck_on_or_after_verified_free_on():
    from helpers import load_data

    wrong = [
        f"{c['name']}: recheck {c['recheck_on']} is before verified {c['verified_free_on']}"
        for c in load_data()["cards"]
        if c["recheck_on"] < c["verified_free_on"]
    ]
    assert not wrong, "\n".join(wrong)


def test_rechecks_not_far_beyond_one_year():
    from helpers import load_data

    stale = [
        f"{c['name']}: recheck {c['recheck_on']} is more than a year after verified {c['verified_free_on']}"
        for c in load_data()["cards"]
        if (
            dt.date.fromisoformat(c["recheck_on"])
            - dt.date.fromisoformat(c["verified_free_on"])
        ).days > 366
    ]
    assert not stale, "rechecks should stay within about a year:\n" + "\n".join(stale)


def test_no_overdue_rechecks():
    """Fails until each overdue card is re-verified and its dates updated."""
    from helpers import load_data

    overdue = [
        f"{c['name']} was due for recheck on {c['recheck_on']} (today: {today()})"
        for c in load_data()["cards"]
        if c["recheck_on"] < today()
    ]
    assert not overdue, (
        "Open {0}, visit each tool below, confirm the free tier still holds, "
        "then update verified_free_on and recheck_on:\n{1}"
    ).format(DATA_URL, "\n".join(overdue))


def test_updates_spread_is_reasonable():
    """The whole directory should not have been stamped on one day only,
    unless it genuinely only has entries from one day."""
    from helpers import load_data

    cards = load_data()["cards"]
    stamps = {c["verified_free_on"] for c in cards}
    if len(cards) >= 10:
        assert len(stamps) >= 2, (
            f"all {len(cards)} cards claim the same verified date; real "
            "verification gets spotted over days"
        )
