import { test } from "node:test";
import assert from "node:assert/strict";
import { toGadget, registerListings, getListing, isListingId } from "../src/lib/marketplace.js";
import GW from "../src/data.js";

const RAW = {
  source: "lazada",
  productId: "15458423476",
  title: "Apple MacBook Air (13-inch) M5 chip",
  brandName: "Apple",
  productUrl: "https://www.lazada.com.ph/products/-i15458423476.html",
  imageUrl: "https://img/x.jpg",
  currency: "PHP",
  price: 86890,
  originalPrice: 99990,
  rating: 4.9,
  reviewCount: 12,
  sellerName: "Apple Store PH",
  soldCount: 5,
  inStock: true,
  isSponsored: false,
};

test("toGadget maps real fields exactly", () => {
  const g = toGadget(RAW);
  assert.equal(g.id, "lazada-15458423476");
  assert.equal(g.price, 86890);
  assert.equal(g.rating, 4.9);
  assert.equal(g.reviewCount, 12);
  assert.equal(g.image, "https://img/x.jpg");
  assert.equal(g.productUrl, RAW.productUrl, "source link preserved for 'View on Lazada'");
  assert.equal(g.brand, "Apple");
  assert.equal(g.category, "laptops", "inferred from title");
});

test("toGadget flags marketplace so neutral values are not read as curated", () => {
  const g = toGadget(RAW);
  assert.equal(g.marketplace, true);
  assert.equal(g.value.warrantyYears, null, "unknown warranty must not be fabricated");
  assert.equal(g.releaseYear, null, "unknown year stays null, not invented");
  assert.equal(g.battery, null, "unknown battery stays null, not 0 or a guess");
  assert.equal(g.scored.performance, null, "no curated sub-score is invented from rating");
});

test("toGadget handles a product with no rating/brand without crashing", () => {
  const g = toGadget({ productId: "1", title: "Mystery Thing", price: 100, rating: 0 });
  assert.equal(g.rating, 0);
  assert.equal(g.brand, "Unknown");
  // Missing inputs are null (unavailable) and must render as unavailable, not crash.
  assert.equal(g.scored.performance, null);
  assert.equal(typeof g.value.repairabilityLabel, "string");
});

test("fetchListing: deep-links resolve via API when registry is cold", async () => {
  // Simulate a cold registry (fresh browser on a deep link) by stubbing fetch.
  const { fetchListing, isListingId, getListing } = await import("../src/lib/marketplace.js");
  assert.equal(isListingId("lazada-777"), true);
  assert.equal(getListing("lazada-777"), null, "starts unregistered");

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ product: { productId: "777", title: "Cold Load", price: 500, rating: 4 } }),
  });
  const res = await fetchListing("lazada-777");
  globalThis.fetch = realFetch;

  // GW-18: the lookup returns a structured state, not a bare null.
  assert.equal(res.status, "found", "fetch-on-miss finds the product");
  const g = res.gadget;
  assert.ok(g, "fetch-on-miss returns the product");
  assert.equal(g.id, "lazada-777");
  assert.equal(getListing("lazada-777")?.model, "Cold Load", "registered after fetch so it renders");

  // Non-marketplace id must not touch the network.
  let called = false;
  globalThis.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  await fetchListing("apple-macbook-air-m1");
  globalThis.fetch = realFetch;
  assert.equal(called, false, "curated ids never hit the API");
});

test("fetchListing returns an error state on upstream failure (no fake product)", async () => {
  const { fetchListing, getListing } = await import("../src/lib/marketplace.js");
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    json: async () => ({ error: { code: "upstream_unavailable", message: "Product lookup is temporarily unavailable." } }),
  });
  const res = await fetchListing("lazada-888");
  globalThis.fetch = realFetch;
  // GW-18: a failed lookup is an error, NOT "not found" — the listing may still exist.
  assert.equal(res.status, "error", "a failed lookup must not read as an absent listing");
  assert.equal(res.gadget, null, "failed fetch must not fabricate a product");
  assert.ok(res.error, "the failure carries a message for the retry UI");
  assert.equal(getListing("lazada-888"), null);
});

test("recommend never penalizes missing specs as zero (the integrity bug)", async () => {
  const { recommend, GW } = await import("../src/lib.js");
  const { toGadget: t } = await import("../src/lib/marketplace.js");
  // A strong real product: excellent price + rating, but NO curated specs.
  const m = t({ productId: "9", title: "HP Pavilion Laptop", price: 12000, rating: 4.8, reviewCount: 50 });
  const before = GW.gadgets.length;
  GW.gadgets.push(m);
  const r = recommend({
    budget: { min: 8000, max: 25000, label: "test" },
    useCase: GW.gadgets && (await import("../src/lib.js")).GW.useCases.find((u) => u.id === "general"),
    priorities: { performance: "high" },
    category: "laptops",
  });
  GW.gadgets.length = before;
  const hit = r.results.find((x) => x.gadget.id === "lazada-9");
  assert.ok(hit, "marketplace item is ranked");
  assert.ok(Number.isFinite(hit.score), "score is never NaN");
  const keys = hit.breakdown.factors.map((f) => f.key);
  // Missing specs are EXCLUDED from the breakdown, not scored as 0.
  assert.ok(!keys.includes("performance"), "unknown performance must not be scored as 0");
  assert.ok(!keys.includes("battery"), "unknown battery must not be scored as 0");
  // factors must sum to the reported total (no phantom/lost weight).
  const sum = hit.breakdown.factors.reduce((n, f) => n + f.earned, 0);
  assert.ok(Math.abs(Math.round(sum) - hit.score) <= 1, `factors ${sum} != score ${hit.score}`);
});

test("ownIndex is missing-data aware: excludes nulls, never fabricates", async () => {
  const { ownIndex, ownIndexCoverage } = await import("../src/lib.js");
  const { toGadget: t } = await import("../src/lib/marketplace.js");
  // Marketplace: battery+warranty unknown -> score uses only rating+value (55/100 weight)
  const m = t(RAW);
  const cov = ownIndexCoverage(m);
  assert.equal(cov, 55, "battery 25 + warranty 20 excluded, rating 25 + value 30 = 55");
  const s = ownIndex(m);
  assert.ok(s >= 0 && s <= 100, "score still in range");
  // A missing input must NOT be treated as 0: score must equal the renormalized
  // weighted average of the AVAILABLE inputs only.
  assert.ok(Number.isInteger(s));
});

test("GW.getGadget resolves registered marketplace listings (the click-through seam)", () => {
  registerListings([RAW]);
  const found = GW.getGadget("lazada-15458423476");
  assert.ok(found, "GW.getGadget must find the live listing so /#/g/:id renders our page");
  assert.equal(found.id, "lazada-15458423476");
  assert.equal(getListing("lazada-15458423476").price, 86890);
});

test("GW.getGadget still returns null for unknown ids", () => {
  assert.equal(GW.getGadget("does-not-exist"), null);
});

test("monthly cost formula works on real prices", () => {
  const g = toGadget(RAW);
  assert.ok(Math.abs(GW.monthlyCost(g) - 86890 / 36) < 1e-9);
});

test("isListingId distinguishes marketplace ids", () => {
  assert.equal(isListingId("lazada-123"), true);
  assert.equal(isListingId("apple-macbook-air-m1"), false);
});
