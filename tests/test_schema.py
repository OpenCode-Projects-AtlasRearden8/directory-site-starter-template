"""Schema tests: data/cards.json shape and field rules.

The schema (also documented in README.md):
  top level
    title          str, non-empty
    tagline        str, non-empty
    updated        str, ISO date YYYY-MM-DD
    maintained_by  str, non-empty
    categories     list of non-empty strings
    cards          list of card objects
  each card (all fields required strings unless marked optional)
    name, category, url, cost, limits, verified_free_on, recheck_on
    notes          optional string
"""

import datetime as dt

import pytest

from helpers import (
    DATA_URL,
    REQUIRED_CARD_FIELDS,
    TOP_LEVEL_FIELDS,
    load_data,
    today,
)

ISO_RE = r"^\d{4}-\d{2}-\d{2}$"


@pytest.fixture(scope="module")
def data():
    return load_data()


@pytest.fixture(scope="module")
def cards(data):
    return data["cards"]


def test_top_level_fields_present(data):
    missing = [f for f in TOP_LEVEL_FIELDS if f not in data]
    assert not missing, f"add missing top-level fields to {DATA_URL}: {missing}"


def test_title_tagline_and_maintainer(data):
    assert data["title"].strip()
    assert data["tagline"].strip()
    assert "Asdale Dynamics, LLC" in data["maintained_by"]


def test_updated_is_iso_date(data):
    assert "updated" in data, DATA_URL
    value = data["updated"]
    try:
        dt.date.fromisoformat(value)
    except (TypeError, ValueError):
        pytest.fail(f"updated must be an ISO date (YYYY-MM-DD), got {value!r}")
    assert value <= today(), "updated is in the future"


def test_categories_are_real_strings(cards):
    categories = load_data()["categories"]
    assert isinstance(categories, list) and categories
    for category in categories:
        assert isinstance(category, str) and category.strip()
    assert len(categories) == len(set(categories)), "duplicate category entries"


def test_every_card_category_is_registered(cards):
    registered = set(load_data()["categories"])
    used = {card["category"] for card in cards}
    unknown = sorted(used - registered)
    assert not unknown, (
        f"categories used by cards but not listed in the categories array: "
        f"{unknown} — add them to the categories list in {DATA_URL}"
    )


def test_card_required_fields(cards):
    problems = []
    for i, card in enumerate(cards):
        label = card.get("name", f"card #{i}")
        for field in REQUIRED_CARD_FIELDS:
            value = card.get(field)
            if not isinstance(value, str) or not value.strip():
                problems.append(f"{label}: field {field!r} is missing or empty")
    assert not problems, "\n".join(problems)


def test_notes_optional_but_string(cards):
    for card in cards:
        if "notes" in card:
            assert isinstance(card["notes"], str), card["name"]


def test_card_urls_are_https(cards):
    bad = [c["name"] for c in cards if not c["url"].startswith("https://")]
    assert not bad, f"every card url must start with https://: {bad}"


def test_card_names_unique(cards):
    names = [c["name"].strip().lower() for c in cards]
    dupes = sorted({n for n in names if names.count(n) > 1})
    assert not dupes, f"duplicate card names: {dupes}"


def test_directory_has_enough_cards_to_be_useful(cards):
    assert len(cards) >= 10, "a directory with fewer than 10 cards is not a directory yet"


def test_known_fields_only(cards):
    allowed = set(REQUIRED_CARD_FIELDS) | {"notes"}
    extra = [
        f"{c['name']}:{k}"
        for c in cards
        for k in c
        if k not in allowed
    ]
    assert not extra, (
        f"unexpected card fields (update the schema docs in README.md if "
        f"intentional): {extra}"
    )


def test_no_personal_data_in_card_names(cards):
    """Cards must be tools, never people (no personal data in files)."""
    suspicious = [c["name"] for c in cards if "@" in c["name"]]
    assert not suspicious, suspicious
