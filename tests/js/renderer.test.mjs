/**
 * Offline renderer tests for assets/app.js, run by pytest via Node.
 * No browser, no network: we import the module directly and assert on its
 * pure functions, then "render" the real data through pageHtml().
 */
import assert from "node:assert/strict";

import {
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
} from "../../assets/app.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const today = new Date().toISOString().slice(0, 10);
const dataPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "cards.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

// --- escapeHtml -------------------------------------------------------------

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml("<script>&amp;\"'</script>"), "&lt;script&gt;&amp;amp;&quot;&#39;&lt;/script&gt;");
});

// --- isIsoDate / isOverdue --------------------------------------------------

test("isIsoDate accepts valid dates and rejects February 30", () => {
  assert.equal(isIsoDate("2026-10-30"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("30-10-2026"), false);
  assert.equal(isIsoDate(""), false);
});

test("isOverdue compares recheck_on with today", () => {
  assert.equal(isOverdue({ recheck_on: "1999-01-01" }, today), true);
  assert.equal(isOverdue({ recheck_on: "2999-01-01" }, today), false);
});

test("overdueCards picks only past rechecks", () => {
  const cards = [
    { name: "old", recheck_on: "1999-01-01" },
    { name: "new", recheck_on: "2999-01-01" },
  ];
  assert.deepEqual(overdueCards(cards, today), [cards[0]]);
});

// --- filterCards -----------------------------------------------------------

test("filterCards with no query and all-category returns everything", () => {
  assert.equal(filterCards(data.cards, { query: "", category: "all" }).length, data.cards.length);
});

test("filterCards matches name case-insensitively", () => {
  const hits = filterCards(data.cards, { query: "ollama" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, "Ollama");
});

test("filterCards matches limits text too", () => {
  const hits = filterCards(data.cards, { query: "your own machine" });
  assert.ok(hits.some((c) => c.name === "Ollama"));
});

test("filterCards by category", () => {
  const hits = filterCards(data.cards, { query: "", category: "Local AI" });
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((c) => c.category === "Local AI"));
});

test("filterCards by category AND query", () => {
  const hits = filterCards(data.cards, { query: "ollama", category: "Chat" });
  assert.equal(hits.length, 0, "Ollama is not a Chat card, so the filters combine");
});

// --- sortCards -------------------------------------------------------------

test("sortCards az sorts by name", () => {
  const names = sortCards(data.cards, "az").map((c) => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
});

test("sortCards recheck puts soonest first", () => {
  const dates = sortCards(data.cards, "recheck").map((c) => c.recheck_on);
  assert.deepEqual(dates, [...dates].sort());
});

test("sortCards does not mutate the input", () => {
  const before = data.cards.map((c) => c.name).join(",");
  sortCards(data.cards, "za");
  assert.equal(before, data.cards.map((c) => c.name).join(","));
});

// --- categoriesOf ----------------------------------------------------------

test("categoriesOf returns sorted unique categories", () => {
  const categories = categoriesOf(data.cards);
  assert.deepEqual(categories, [...new Set(categories)]);
  assert.deepEqual(categories, [...categories].sort((a, b) => a.localeCompare(b, "en")));
});

// --- cardHtml / pageHtml ---------------------------------------------------

test("cardHtml renders name, cost, limits, and dates", () => {
  const card = data.cards[0];
  const html = cardHtml(card, today);
  assert.match(html, new RegExp(escapeHtml(card.name)));
  assert.match(html, new RegExp(escapeHtml(card.cost)));
  assert.match(html, new RegExp(escapeHtml(card.limits)));
  assert.match(html, new RegExp(card.verified_free_on));
  assert.match(html, new RegExp(card.recheck_on));
});

test("cardHtml marks overdue rechecks with a badge", () => {
  const html = cardHtml({ recheck_on: "1999-01-01", name: "x", url: "https://x" }, today);
  assert.match(html, /badge-overdue/);
  assert.match(html, /Recheck overdue/);
});

test("cardHtml escapes hostile fields", () => {
  const html = cardHtml(
    { name: "<img src=x onerror>", cost: "Free", limits: "<b>", url: "https://x", verified_free_on: "2026-01-01", recheck_on: "2999-01-01" },
    today,
  );
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x"));
});

test("pageHtml count for unfiltered view says 'all'", () => {
  const { countHtml, cardsHtml } = pageHtml(data.cards, { query: "", category: "all", today });
  assert.match(countHtml, /all/);
  assert.ok(cardsHtml.length > 0);
});

test("pageHtml count for filtered view says 'of N'", () => {
  const { countHtml, cardsHtml } = pageHtml(
    data.cards,
    { query: "ollama", category: "Local AI", today },
  );
  assert.match(countHtml, /of \d+ tools/);
  assert.ok(cardsHtml.includes("Ollama"));
});

test("pageHtml shows a friendly empty state", () => {
  const { countHtml, cardsHtml } = pageHtml(data.cards, { query: "zzzznope", today });
  assert.match(countHtml, /No matches/);
  assert.match(cardsHtml, /Try a shorter search/);
});

test("pageHtml renders every visible card", () => {
  const visible = data.cards.filter((c) => c.category === "Chat");
  const { cardsHtml } = pageHtml(data.cards, { category: "Chat", today });
  for (const card of visible) assert.ok(cardsHtml.includes(card.name), `missing ${card.name}`);
});

// --- validateCardsData ------------------------------------------------------

test("validateCardsData passes the real dataset", () => {
  assert.deepEqual(validateCardsData(data, today), []);
});

test("validateCardsData flags missing fields and overdue rechecks", () => {
  const broken = {
    title: "t",
    updated: today,
    maintained_by: "m",
    categories: ["Chat"],
    cards: [{ name: "broken", recheck_on: "1999-01-01", category: "Chat" }],
  };
  const errors = validateCardsData(broken, today);
  assert.ok(errors.some((e) => e.includes("missing or empty field")));
  assert.ok(errors.some((e) => e.includes("overdue")));
});

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
console.log(`PASS ${tests.length} renderer tests`);
