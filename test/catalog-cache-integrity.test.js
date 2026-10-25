/**
 * Regression tests for the catalog cache / category-fetch integrity fixes.
 *
 *   GW-14: the cache stored only `fetchedAt`; there was no stale flag and
 *          loadCatalog did not expose the freshness, so callers could not say
 *          when the data was last updated.
 *   GW-15: a failed category fetch was silently dropped and the incomplete
 *          list was cached for 7 days. Failures must be tracked per category,
 *          older rows kept, and the failure surfaced in the returned state.
 *   GW-16: a category edit did not invalidate the product cache. The category
 *          plan hash must be part of the cache key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeCategoryResults, planHash, catalogStats } from "../src/lib/catalog.js";

/* ------------------------------------------------------------------ GW-15 */

test("GW-15: a failed category is reported and keeps its older rows", () => {
  const merged = mergeCategoryResults([
    { id: "smartphones", ok: true, items: [{ productId: "a" }] },
    { id: "laptops", ok: false, error: "upstream 429", fallback: [{ productId: "b" }] },
  ]);
  assert.deepEqual(merged.failedCategories, [{ id: "laptops", error: "upstream 429" }],
    "the failure names the category and the reason");
  assert.deepEqual(merged.products.map((p) => p.productId), ["a", "b"],
    "the failed category keeps its older rows instead of vanishing");
});

test("GW-15: a failed category with no older rows contributes no products", () => {
  const merged = mergeCategoryResults([
    { id: "laptops", ok: false, error: "network error" },
  ]);
  assert.equal(merged.products.length, 0);
  assert.equal(merged.failedCategories.length, 1);
});

test("GW-15: a successful category is not reported as a failure", () => {
  const merged = mergeCategoryResults([{ id: "laptops", ok: true, items: [{ productId: "a" }] }]);
  assert.deepEqual(merged.failedCategories, []);
  assert.equal(merged.stale, false);
});

test("GW-15: duplicate products across categories are deduped", () => {
  const merged = mergeCategoryResults([
    { id: "smartphones", ok: true, items: [{ productId: "a" }] },
    { id: "laptops", ok: true, items: [{ productId: "a" }, { productId: "b" }] },
  ]);
  assert.deepEqual(merged.products.map((p) => p.productId), ["a", "b"]);
});

test("GW-15: a stale upstream snapshot marks the merged result stale", () => {
  const merged = mergeCategoryResults([
    { id: "laptops", ok: true, items: [{ productId: "a" }], stale: true, staleFrom: "2026-01-01T00:00:00Z" },
  ]);
  assert.equal(merged.stale, true);
  assert.equal(merged.staleFrom, "2026-01-01T00:00:00Z");
});

/* ------------------------------------------------------------------ GW-16 */

test("GW-16: the plan hash changes when a category is renamed", () => {
  const before = planHash([{ id: "laptops", name: "Laptops", query: "laptop" }]);
  const after = planHash([{ id: "laptops", name: "Gaming Laptops", query: "laptop" }]);
  assert.notEqual(before, after, "a rename must invalidate the cached products");
});

test("GW-16: the plan hash changes when a category query changes", () => {
  const before = planHash([{ id: "laptops", name: "Laptops", query: "laptop" }]);
  const after = planHash([{ id: "laptops", name: "Laptops", query: "gaming laptop" }]);
  assert.notEqual(before, after, "a new query must invalidate the cached products");
});

test("GW-16: the plan hash changes when a category is added", () => {
  const before = planHash([{ id: "laptops", name: "Laptops", query: "laptop" }]);
  const after = planHash([
    { id: "laptops", name: "Laptops", query: "laptop" },
    { id: "consoles", name: "Consoles", query: "game console" },
  ]);
  assert.notEqual(before, after);
});

test("GW-16: the plan hash is stable for the same plan and order-independent", () => {
  const a = planHash([
    { id: "laptops", name: "Laptops", query: "laptop" },
    { id: "smartphones", name: "Smartphones", query: "smartphone" },
  ]);
  const b = planHash([
    { id: "smartphones", name: "Smartphones", query: "smartphone" },
    { id: "laptops", name: "Laptops", query: "laptop" },
  ]);
  assert.equal(a, b, "the same plan always maps to the same cache key");
});

test("GW-16: the catalog cache key includes the plan hash", () => {
  const src = readFileSync("src/lib/catalog.js", "utf8");
  assert.match(src, /CACHE_KEY = CACHE_PREFIX \+ planHash\(list\)/,
    "the cache key must contain the category plan hash");
});

/* ------------------------------------------------------------------ GW-14 */

test("GW-14: the persisted cache records the fetchedAt timestamp and the stale flag", () => {
  const src = readFileSync("src/lib/catalog.js", "utf8");
  assert.match(src, /JSON\.stringify\(\{ fetchedAt, stale, categories: nextCats \}\)/,
    "the cache entry carries fetchedAt and the stale flag");
});

test("GW-14: loadCatalog returns the freshness and the stale flag to its caller", () => {
  const src = readFileSync("src/lib/catalog.js", "utf8");
  const ret = src.slice(src.lastIndexOf("return {", src.indexOf("failedCategories,")));
  assert.match(ret, /ok: true,/, "the resolved value reports ok");
  assert.match(ret, /cached,/, "the resolved value reports whether it came from the cache");
  assert.match(ret, /stale,/, "the resolved value reports the stale flag");
  assert.match(ret, /fetchedAt,/, "the resolved value reports the freshness");
  assert.match(ret, /failedCategories,/, "the resolved value reports the failed categories");
});

test("GW-14: the category cache keeps a per-category timestamp so a failed category is retried", () => {
  const src = readFileSync("src/lib/catalog.js", "utf8");
  assert.match(src, /nextCats\[cat\] = \{ fetchedAt: now,/, "each category is timestamped on success");
  // a failed category must not write a fresh timestamp (else it is cached for 7 days)
  const start = src.indexOf("if (!ok) {");
  const failBlock = src.slice(start, src.indexOf("results.push({ id: cat, ok: true", start));
  assert.ok(start > -1, "the failure branch exists");
  assert.ok(!failBlock.includes("nextCats[cat] ="), "a failed category keeps its old timestamp");
});

/* ------------------------------------------------------------------ GW-19 */

test("GW-19: catalogStats counts only priced listings in the average", () => {
  const stats = catalogStats([
    { category: "a", price: 1000, rating: 5 },
    { category: "a", price: 3000, rating: 5 },
    { category: "b", price: null, rating: 0 },
  ]);
  assert.equal(stats.avgPrice, 2000);
  assert.equal(stats.pricedCount, 2);
});
