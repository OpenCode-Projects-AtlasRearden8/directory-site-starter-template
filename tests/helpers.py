"""Shared helpers for the directory-site test suite."""

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = ROOT / "data" / "cards.json"
DATA_URL = "data/cards.json"

INDEX_PATH = ROOT / "index.html"
APP_JS_PATH = ROOT / "assets" / "app.js"
STYLES_PATH = ROOT / "assets" / "styles.css"

README_PATH = ROOT / "README.md"
LICENSE_PATH = ROOT / "LICENSE"

COPYRIGHT = "Copyright (c) 2026 Asdale Dynamics, LLC"

REQUIRED_CARD_FIELDS = (
    "name",
    "category",
    "url",
    "cost",
    "limits",
    "verified_free_on",
    "recheck_on",
)

TOP_LEVEL_FIELDS = (
    "title",
    "tagline",
    "updated",
    "maintained_by",
    "categories",
    "cards",
)


def load_data():
    """Read data/cards.json as a dict, failing loudly if unparseable."""
    try:
        return json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:  # pragma: no cover - messaging only
        sys.exit(f"data/{DATA_PATH.name} is not valid JSON: {exc}")


def today():
    return date.today().isoformat()
