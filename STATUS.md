# STATUS.md

## What was built

A copy-ready, JSON-driven **directory site template** for free-*-directory
repos, maintained by Asdale Dynamics, LLC (MIT licensed).

Pieces:

- `data/cards.json` — the entire directory as hand-editable JSON: title,
  tagline, last-updated date, maintainer credit, a category registry, and 17
  sample cards. Each card carries `name`, `category`, `url`, `cost`,
  `limits`, `verified_free_on`, `recheck_on`, and optional `notes`.
- `index.html` — one static page with a live search box, a category dropdown
  built from the data, a sort control (A–Z, Z–A, recheck soonest), a
  "Showing X of Y" counter, and "Recheck overdue" badges driven by the dates.
- `assets/app.js` — vanilla ES-module renderer (no dependencies, no build
  step). Pure functions are importable from Node; DOM wiring is guarded.
- `assets/styles.css` — warm, plain styling.
- `tests/` — offline pytest suite: schema rules (`test_schema.py`), date
  freshness rules (`test_dates.py`), page structure + wiring + a Node
  renderer harness (`test_page.py`, `tests/js/renderer.test.mjs`).
- `README.md` — schema reference, quick start, maintenance (date workflow),
  copy-into-new-repo instructions; credits Asdale Dynamics, LLC.
- `LICENSE` — MIT, Copyright (c) 2026 Asdale Dynamics, LLC.

Distinct from `csv-to-table-site-template` (sortable CSV tables) and
`csv-flashcards-site-template` (study decks): this one is card directories
with verified-free/recheck dates.

## How to run it

```bash
python3 -m http.server 8000        # then visit http://localhost:8000
python3 -m pip install -r requirements.txt   # pytest, once
python3 -m pytest                  # offline test suite
node tests/js/renderer.test.mjs    # renderer suite standalone (optional)
```

HTTP serving is required because the page fetches `data/cards.json`
(browsers block `fetch()` from `file://`).

## Verification results (as of 2026-10-30)

- `python3 -m pytest -v` — **26 passed** (schema 11, dates 6, page 9,
  including the 22-assertion Node renderer harness).
- `node tests/js/renderer.test.mjs` — **22 renderer tests PASS** standalone.
- Served the folder with `python3 -m http.server 8944` — index page,
  `data/cards.json`, `assets/app.js`, and `assets/styles.css` all return
  `200`; JSON parses to 17 cards under the expected title.
- Renderer + `initPage` behavior (fetch, category dropdown build, badge,
  error states) is covered offline by the guarded DOM design; no browser
  launch is needed for the suite.

## Known gaps

- No browser (Playwright/Chromium) test: DOM wiring is exercised indirectly
  and by guarded module import; a real-browser test would be the next layer
  of confidence.
- No `.github/workflows` deployment file — kept out deliberately
  (local-first); GitHub Pages needs only "publish repo root".
- Sample card limits are plain-English summaries stamped with a
  verification date, not contractual specs; the recheck-date tests exist
  precisely because they inevitably drift.
- The overdue-recheck test will start failing once 2026-11/2027-01 dates
  pass — by design. Update `verified_free_on`/`recheck_on` in
  `data/cards.json` to go green again.
