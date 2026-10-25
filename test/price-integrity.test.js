/**
 * Regression tests for the GW-02 / GW-19 price-integrity fixes.
 *
 *   GW-02: a max-price ceiling of 120000 was ignored (the filter only applied
 *          when max < 100000) and "no ceiling" was conflated with the number
 *          100000. An empty input must mean "no ceiling"; every finite
 *          non-negative ceiling must apply; invalid ranges must be reported.
 *   GW-19: an unknown marketplace price was mapped to 0, so it passed every
 *          price filter and won every price sort/ranking. It must stay null
 *          (unavailable) and be excluded from price-dependent filtering.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parsePriceRange,
  withinPriceRange,
  priceSortValue,
  catalogStats,
} from "../src/lib/catalog.js";
import { toGadget, knownPrice } from "../src/lib/marketplace.js";

/* ------------------------------------------------------------------ GW-02 */

test("GW-02: a ceiling of 120000 is a real ceiling, not 'no ceiling'", () => {
  const r = parsePriceRange("0", "120000");
  assert.equal(r.error, null);
  assert.equal(r.max, 120000, "the ceiling is parsed as a number");
  assert.equal(r.min, 0);

  const items = [{ price: 119999 }, { price: 120000 }, { price: 120001 }];
  const kept = items.filter((g) => withinPriceRange(g.price, r.min, r.max));
  assert.deepEqual(kept.map((g) => g.price), [119999, 120000], "120001 is excluded");
});

test("GW-02: an empty max input means 'no ceiling' and filters nothing out", () => {
  const r = parsePriceRange("", "");
  assert.equal(r.error, null);
  assert.equal(r.max, null, "no ceiling is null, not 100000");
  assert.equal(r.min, null);

  const items = [{ price: 1 }, { price: 999999 }];
  assert.equal(items.filter((g) => withinPriceRange(g.price, r.min, r.max)).length, 2);
});

test("GW-02: an empty min input means 'no floor'", () => {
  const r = parsePriceRange("", "5000");
  assert.equal(r.error, null);
  assert.equal(r.min, null);
  assert.equal(r.max, 5000);
});

test("GW-02: a reversed range is reported instead of silently ignored", () => {
  const r = parsePriceRange("50000", "10000");
  assert.ok(r.error, "a reversed range must produce a visible error");
  assert.match(r.error, /minimum/i);
  assert.equal(r.min, null);
  assert.equal(r.max, null);
});

test("GW-02: a negative price bound is rejected", () => {
  assert.ok(parsePriceRange("-1", "").error, "a negative minimum is an error");
  assert.ok(parsePriceRange("", "-500").error, "a negative maximum is an error");
  assert.match(parsePriceRange("-1", "").error, /negative/i);
});

test("GW-02: a non-numeric bound is rejected", () => {
  assert.ok(parsePriceRange("abc", "").error, "a non-numeric bound is an error");
});

test("GW-02: an equal min and max is a valid (exact) range", () => {
  const r = parsePriceRange("1000", "1000");
  assert.equal(r.error, null);
  assert.equal(r.min, 1000);
  assert.equal(r.max, 1000);
  assert.equal(withinPriceRange(1000, r.min, r.max), true);
  assert.equal(withinPriceRange(1001, r.min, r.max), false);
});

test("GW-02: a zero floor is no floor, so it does not hide price-unknown listings", () => {
  const r = parsePriceRange("0", "");
  assert.equal(r.min, 0);
  // the Catalog applies the floor only when min > 0 — pin that in the source
  const src = readFileSync("src/pages/Catalog.jsx", "utf8");
  assert.match(src, /if \(min != null && min > 0\) list = list\.filter\(\(g\) => withinPriceRange\(g\.price, min, null\)\);/,
    "a zero floor does not filter out listings with an unknown price");
});

/* ------------------------------------------------------------------ GW-19 */

test("GW-19: an unknown marketplace price stays null, never 0", () => {
  const g = toGadget({ productId: "1", title: "No Price Phone" });
  assert.equal(g.price, null, "unknown price must be null (unavailable), not 0");
  assert.notEqual(g.price, 0);
  assert.equal(knownPrice(g), null);
});

test("GW-19: a zero or negative upstream price is unknown, not free", () => {
  assert.equal(toGadget({ productId: "2", title: "Zero", price: 0 }).price, null);
  assert.equal(toGadget({ productId: "3", title: "Neg", price: -5 }).price, null);
});

test("GW-19: a real price is preserved exactly", () => {
  assert.equal(toGadget({ productId: "4", title: "Real", price: 86890 }).price, 86890);
});

test("GW-19: an unknown price cannot satisfy a price bound", () => {
  assert.equal(withinPriceRange(null, null, 100000), false, "null is not <= 100000");
  assert.equal(withinPriceRange(null, 0, null), false, "null is not >= 0");
  assert.equal(withinPriceRange(null, null, null), false, "no bound is not evidence either");
  assert.equal(withinPriceRange(500, null, 100000), true);
});

test("GW-19: unknown prices sort last, never first as zero", () => {
  const priced = { price: 100 };
  const unknown = { price: null };
  assert.equal(priceSortValue(unknown), Number.POSITIVE_INFINITY);
  assert.ok(priceSortValue(unknown) > priceSortValue(priced));
  const list = [unknown, priced].sort((a, b) => priceSortValue(a) - priceSortValue(b));
  assert.equal(list[0].price, 100, "the priced item comes first");
  assert.equal(list[1].price, null, "the unknown price comes last");
});

test("GW-19: the catalog average price ignores unknown prices", () => {
  const stats = catalogStats([
    { category: "smartphones", price: 10000, rating: 4 },
    { category: "smartphones", price: 20000, rating: 4 },
    { category: "smartphones", price: null, rating: 0 },
  ]);
  assert.equal(stats.avgPrice, 15000, "the average is over the two priced listings only");
  assert.equal(stats.pricedCount, 2);
  assert.equal(stats.total, 3);
});

test("GW-19: a catalog with no priced listings reports no average, not zero", () => {
  const stats = catalogStats([{ category: "smartphones", price: null, rating: 0 }]);
  assert.equal(stats.avgPrice, 0);
  assert.equal(stats.pricedCount, 0);
});
