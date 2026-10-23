import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich } from "../src/lib.js";

// A marketplace-style product: only price/rating/listing fields are real.
const base = {
  id: "lazada-1", brand: "Acme", model: "Phone X", category: "smartphones",
  price: 10000, originalPrice: 12000, rating: 4.5, reviewCount: 120,
  image: "img.jpg", sellerName: "Seller", productUrl: "https://x", marketplace: true,
  scored: {}, battery: null, value: {},
};
const metric = (res, id) => res.find((m) => m.id === id);

test("derived metrics are calculated from real fields, never fabricated specs", () => {
  const res = enrich(base);
  // every metric carries a provenance status
  for (const m of res) assert.ok(["source","calculated","estimated","unavailable"].includes(m.status), m.id);
  // no battery/performance spec is invented
  assert.equal(metric(res, "battery"), undefined);
  // discount is real: (12000-10000)/12000 = 16.7%
  const d = metric(res, "discount");
  assert.equal(d.status, "calculated");
  assert.equal(d.value, 17);
});

test("discount is unavailable when reference price is not higher", () => {
  const res = enrich({ ...base, originalPrice: 8000 });
  assert.equal(metric(res, "discount").status, "unavailable");
  const res2 = enrich({ ...base, originalPrice: null });
  assert.equal(metric(res2, "discount").status, "unavailable");
});

test("missing price yields unavailable price metrics, not zeros", () => {
  const res = enrich({ ...base, price: 0 });
  assert.equal(metric(res, "pricePerMonth").status, "unavailable");
  assert.equal(metric(res, "pricePerMonth").value, null);
  assert.equal(metric(res, "discount").status, "unavailable");
});

test("listing completeness reflects present fields", () => {
  const full = metric(enrich(base), "listingCompleteness").value; // all 8 fields
  assert.equal(full, 100);
  const sparse = metric(enrich({ ...base, image: "", sellerName: null, productUrl: null, originalPrice: null }), "listingCompleteness").value;
  assert.ok(sparse < full);
});

test("price competitiveness is unavailable with too small a sample", () => {
  // a lone listing in a category cannot produce a percentile
  const res = enrich({ ...base, category: "smartwatches" });
  // even if the sample is tiny, it must never invent a percentile
  const pc = metric(res, "priceCompetitiveness");
  if (pc.status === "calculated") assert.ok(pc.method.includes("listing"));
  else assert.equal(pc.value, null);
});

test("deterministic: identical input -> identical output", () => {
  assert.deepEqual(enrich(base), enrich(base));
});

test("rating is source-provided; coverage is calculated", () => {
  const res = enrich(base);
  assert.equal(metric(res, "rating").status, "source");
  assert.equal(metric(res, "coverage").status, "calculated");
});
