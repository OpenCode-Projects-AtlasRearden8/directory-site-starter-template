/**
 * Directory-site renderer.
 *
 * Pure functions live at the top of this file so the test suite can import
 * them with plain Node (no browser, no dependencies). All DOM wiring is
 * guarded at the bottom and only runs when the page is actually open.
 */

const DATA_URL = "data/cards.json";

const REQUIRED_FIELDS = [
  "name",
  "category",
  "url",
  "cost",
  "limits",
  "verified_free_on",
  "recheck_on",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= days;
}

function isOverdue(card, today) {
  return card.recheck_on < today;
}

/** Cards whose recheck date has already passed. */
function overdueCards(cards, today) {
  return cards.filter((card) => isOverdue(card, today));
}

/** Sorted unique categories, for the filter dropdown. */
function categoriesOf(cards) {
  return [...new Set(cards.map((card) => card.category))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

/** Case-insensitive match against the fields a reader would search by. */
function matchesQuery(card, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [card.name, card.category, card.cost, card.limits, card.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function filterCards(cards, { query = "", category = "all" } = {}) {
  return cards.filter(
    (card) =>
      (category === "all" || card.category === category) &&
      matchesQuery(card, query),
  );
}

function sortCards(cards, mode = "az") {
  const sorted = [...cards];
  if (mode === "za") {
    sorted.sort((a, b) => b.name.localeCompare(a.name, "en", { sensitivity: "base" }));
  } else if (mode === "recheck") {
    sorted.sort((a, b) => a.recheck_on.localeCompare(b.recheck_on));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }
  return sorted;
}

function cardHtml(card, today) {
  const badge = isOverdue(card, today)
    ? '<span class="badge badge-overdue">Recheck overdue</span>'
    : '<span class="badge badge-ok">Free, verified</span>';
  const notes = card.notes
    ? `<p class="card-notes">${escapeHtml(card.notes)}</p>`
    : "";
  return [
    '  <article class="card">',
    '    <div class="card-head">',
    `      <h3 class="card-name">${escapeHtml(card.name)}</h3>`,
    `      <span class="card-category">${escapeHtml(card.category)}</span>`,
    "    </div>",
    `      <div class="badges">${badge}</div>`,
    `    <p class="card-cost"><strong>Cost:</strong> ${escapeHtml(card.cost)}</p>`,
    `    <p class="card-limits"><strong>Limits:</strong> ${escapeHtml(card.limits)}</p>`,
    notes,
    `    <p class="card-dates">Verified free on <time datetime="${escapeHtml(card.verified_free_on)}">${escapeHtml(card.verified_free_on)}</time> · recheck by <time datetime="${escapeHtml(card.recheck_on)}">${escapeHtml(card.recheck_on)}</time></p>`,
    `    <p class="card-link"><a href="${escapeHtml(card.url)}" rel="noopener">${escapeHtml(card.url)}</a></p>`,
    "  </article>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Markup for the card grid + counter, given the full (unfiltered) dataset
 * and the current view state. Used by the page and by the render tests.
 */
function pageHtml(cards, { query = "", category = "all", sort = "az", today } = {}) {
  const visible = sortCards(filterCards(cards, { query, category }), sort);
  const count = visible.length;
  if (count === 0) {
    return {
      countHtml: `No matches — ${escapeHtml(String(cards.length))} tools, all filtered out.`,
      cardsHtml: '<p class="empty">Try a shorter search or a different category.</p>',
    };
  }
  const countHtml =
    count === cards.length
      ? `Showing all ${count} tools.`
      : `Showing ${count} of ${cards.length} tools.`;
  return {
    countHtml,
    cardsHtml: visible.map((card) => cardHtml(card, today)).join("\n"),
  };
}

function validateCardsData(data, today) {
  const errors = [];
  if (!data || typeof data !== "object") return ["data must be an object"];
  for (const field of ["title", "updated", "maintained_by", "categories", "cards"]) {
    if (!(field in data)) errors.push(`missing top-level field: ${field}`);
  }
  const cards = Array.isArray(data.cards) ? data.cards : [];
  if (cards.length === 0) errors.push("cards must contain at least one entry");
  for (const card of cards) {
    for (const field of REQUIRED_FIELDS) {
      if (typeof card?.[field] !== "string" || card[field].trim() === "") {
        errors.push(`${card?.name || "unnamed card"}: missing or empty field ${field}`);
      }
    }
    if (card?.recheck_on < today) {
      errors.push(`${card.name}: recheck date ${card.recheck_on} is overdue (today is ${today}); re-verify the free tier and update both dates`);
    }
  }
  return errors;
}

async function initPage() {
  const cardsEl = document.getElementById("cards");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  const categoryEl = document.getElementById("category");
  const sortEl = document.getElementById("sort");
  const metaEl = document.getElementById("data-meta");
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const today = new Date().toISOString().slice(0, 10);
    const errors = validateCardsData(data, today);
    if (errors.length > 0) {
      countEl.textContent = "Data problem found — fix data/cards.json";
      cardsEl.innerHTML = `<div class="error"><p>The directory data failed validation:</p><ul>${errors
        .map((e) => `<li>${escapeHtml(e)}</li>`)
        .join("")}</ul></div>`;
      return;
    }
    if (metaEl) {
      metaEl.textContent = `Data last updated ${data.updated}. Maintained by ${data.maintained_by}.`;
    }
    if (categoryEl && categoryEl.options.length === 1) {
      for (const category of categoriesOf(data.cards)) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryEl.append(option);
      }
    }
    const state = { query: "", category: "all", sort: "az", today };
    const render = () => {
      const { countHtml, cardsHtml } = pageHtml(data.cards, state);
      countEl.textContent = countHtml;
      cardsEl.innerHTML = cardsHtml;
    };
    searchEl?.addEventListener("input", () => {
      state.query = searchEl.value;
      render();
    });
    categoryEl?.addEventListener("change", () => {
      state.category = categoryEl.value;
      render();
    });
    sortEl?.addEventListener("change", () => {
      state.sort = sortEl.value;
      render();
    });
    render();
  } catch (error) {
    cardsEl.innerHTML = `<div class="error"><p>Could not load <code>${DATA_URL}</code> (${escapeHtml(
      error.message,
    )}). Serve the folder over HTTP, e.g. <code>python3 -m http.server</code>.</p></div>`;
    countEl.textContent = "Data not loaded.";
  }
}

if (typeof document !== "undefined" && document.readyState !== "loading") {
  initPage();
} else if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initPage);
}

export {
  REQUIRED_FIELDS,
  DATA_URL,
  cardHtml,
  categoriesOf,
  escapeHtml,
  filterCards,
  isIsoDate,
  isOverdue,
  overdueCards,
  pageHtml,
  sortCards,
  validateCardsData,
};
