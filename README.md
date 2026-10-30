# directory-site-starter-template

A copy-ready starter for **JSON-driven directory sites**: one `data/cards.json`
file you edit by hand, one static page with search and category filtering, and
an offline pytest suite that keeps your data honest — including dates for when
each listing was **last verified as free** and when it is **due for recheck**.

Made by [Asdale Dynamics, LLC](https://dylanasdale.github.io) — the same folks
behind *The Massive AI Manual*. Things here are explained like a friend would:
plain English, step by step, never condescending.

This template is for **card directories** (name, cost, limits, verified-free
dates). Different from its siblings:

- `csv-to-table-site-template` — spreadsheets rendered as **sortable tables**
- `csv-flashcards-site-template` — decks of **study flashcards**

## What you get

- `data/cards.json` — the whole directory lives here; a 17-card sample
  (free AI tools) is included so the template arrives working.
- `index.html` — a one-page site with:
  - a **search box** (name, cost, limits, notes) filtering as you type,
  - a **category dropdown** built automatically from your own data,
  - a **sort control** (A–Z, Z–A, recheck soonest),
  - a live "Showing X of Y tools" counter,
  - an "overdue recheck" badge driven by the dates in your data.
- `assets/app.js` — vanilla JavaScript ES module (no dependencies, no build
  step); its rendering/filter functions are imported straight into tests.
- `tests/` — an offline pytest suite (plus a small Node renderer harness).
- `LICENSE`, `README.md` — MIT, copy freely.

## The cards.json schema

Top level:

| Field | Meaning |
| --- | --- |
| `title` | Page and window title |
| `tagline` | One-line pitch shown under the title |
| `updated` | ISO date you last touched the data (`YYYY-MM-DD`) |
| `maintained_by` | Credit line shown in the page footer |
| `categories` | List of category names, e.g. `"Chat"` |
| `cards` | The actual directory entries |

Each **card** (in `cards`):

| Field | Meaning |
| --- | --- |
| `name` | Tool name (must be unique) |
| `category` | One of the names in `categories` |
| `url` | `https://` link to the tool |
| `cost` | e.g. `"Free"`, `"Free tier"`, `"Free, open source"` |
| `limits` | What the free tier genuinely includes/excludes |
| `verified_free_on` | ISO date you actually verified it is free |
| `recheck_on` | ISO date the verification is considered stale |
| `notes` | Optional plain-English comment for readers |

```json
{
  "name": "Ollama",
  "category": "Local AI",
  "url": "https://ollama.com",
  "cost": "Free, open source",
  "limits": "Runs on your own machine; model size limited by your RAM and disk",
  "verified_free_on": "2026-10-12",
  "recheck_on": "2027-01-12",
  "notes": "One command installs a local model runner; nothing leaves your computer."
}
```

## Quick start (30 seconds)

1. Open a terminal in this folder and start a tiny local server:

   ```bash
   python3 -m http.server 8000
   ```

2. Visit http://localhost:8000 — your directory is live with the sample data.

(Serving over HTTP matters: the page fetches `data/cards.json`, and browsers
block `fetch()` from plain `file://` pages for security.)

3. To make it your own, rename the directory in `README.md`, edit
   `data/cards.json`, and change `data/` names, `index.html` headings as
   needed.

## Copy this into a new directory site

The folder copies cleanly into a new repo (e.g. `free-gardening-directory`):

1. Copy the whole folder, `git init` it, and edit `data/cards.json`.
2. Update the `title`, `tagline`, and categories at the top of the JSON.
3. Delete the sample cards and add yours — one card per tool.
4. Run the tests (below). Green means the schema, dates, and page all hold.
5. Commit. Done.

No secrets and no personal data go in `cards.json` — it gets published.
Links are public official tool pages only.

## The date workflow (why this stays honest)

Free tiers drift. The two date fields turn "is it still free?" into a queue:

- `recheck_on` is a promise to yourself: after that date the data is stale.
- The page shows **Recheck overdue** badges; the tests fail with a list of
  exactly which tools to re-verify.
- When you re-verify a tool, set `verified_free_on` to today and push
  `recheck_on` forward (a quarter ahead is the house rhythm).

That is the whole maintenance loop: run the tests, fix what they name.

## Tests

```bash
python3 -m pip install -r requirements.txt   # pytest, once
python3 -m pytest                            # the whole offline suite
```

The suite covers:

- **Schema** — every card has `name`, `category`, `url`, `cost`, `limits`,
  `verified_free_on`, `recheck_on`; categories match the registry; names are
  unique; URLs are `https://`.
- **Dates** — every date parses; rechecks are never before verification and
  never more than ~a year out; any overdue recheck fails the build until you
  update it.
- **Page** — `index.html` is well-formed and has the controls the JavaScript
  expects, the assets exist, and the renderer itself is exercised through
  Node (`tests/js/renderer.test.mjs`): escaping, filtering, sorting, badges,
  empty states, and validation of the real dataset.

Node is optional — without it the renderer submodule tests skip and the rest
still runs.

## Publishing

The template folder is already a valid static site root. GitHub Pages or
any static host works: commit the folder as the repo root and point Pages at
main. The tests are the pre-publish check.

## Files

| File | What it is |
| --- | --- |
| `data/cards.json` | The entire directory: schema + sample data |
| `index.html` | The page: search, category filter, sort, card grid |
| `assets/app.js` | Renderer, filters, badges (ES module) |
| `assets/styles.css` | Warm plain styling, no frameworks |
| `tests/test_schema.py` | Field rules for cards.json |
| `tests/test_dates.py` | verified-free-on / recheck-on freshness |
| `tests/test_page.py` | HTML structure, wiring, Node renderer suite |
| `tests/js/renderer.test.mjs` | Node harness for app.js functions |

## License

MIT — see `LICENSE`. Copyright (c) 2026 Asdale Dynamics, LLC.
