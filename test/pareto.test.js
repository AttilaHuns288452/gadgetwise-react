import { test } from "node:test";
import assert from "node:assert/strict";
import { paretoFrontier, bruteForceFrontier, dominates, OBJECTIVES, listingCompleteness } from "../src/lib/pareto.js";

// controllable gadget factory; omitted numeric fields are "missing"
const g = (id, o = {}) => ({
  id,
  brand: o.brand ?? "Acme",
  model: id,
  category: o.category ?? "smartphones",
  price: o.price,
  rating: o.rating,
  reviewCount: o.reviewCount,
  originalPrice: o.originalPrice,
  image: o.image ?? "img.jpg",
  sellerName: o.sellerName ?? "Seller",
  productUrl: o.productUrl ?? "https://x",
});

const ids = (arr) => arr.map((x) => x.id).sort();

test("a fully dominated product is not on the frontier", () => {
  const cheapGood = g("a", { price: 100, rating: 5 });
  const expensiveBad = g("b", { price: 200, rating: 3 });
  const r = paretoFrontier([cheapGood, expensiveBad], ["price", "rating"]);
  assert.deepEqual(ids(r.frontier), ["a"]);
  assert.deepEqual(ids(r.dominated), ["b"]);
});

test("equal objective values never dominate each other", () => {
  const a = g("a", { price: 100, rating: 4 });
  const b = g("b", { price: 100, rating: 4 });
  const r = paretoFrontier([a, b], ["price", "rating"]);
  assert.deepEqual(ids(r.frontier), ["a", "b"]); // both non-dominated
  assert.equal(dominates([100, 4], [100, 4], [OBJECTIVES.price, OBJECTIVES.rating]), false);
});

test("conflicting trade-offs: neither dominates", () => {
  const cheapWeak = g("a", { price: 100, rating: 3 });
  const priceyStrong = g("b", { price: 200, rating: 5 });
  const r = paretoFrontier([cheapWeak, priceyStrong], ["price", "rating"]);
  assert.deepEqual(ids(r.frontier), ["a", "b"]);
});

test("respects min and max directions", () => {
  const cheapWeak = g("a", { price: 100, rating: 3 });
  const priceyStrong = g("b", { price: 200, rating: 5 });
  // price-only (min): cheaper (a) dominates pricier (b)
  assert.deepEqual(ids(paretoFrontier([cheapWeak, priceyStrong], ["price"]).frontier), ["a"]);
  // rating-only (max): higher rating (b) dominates lower (a)
  assert.deepEqual(ids(paretoFrontier([cheapWeak, priceyStrong], ["rating"]).frontier), ["b"]);
  // both together: a trade-off, neither dominates
  assert.deepEqual(ids(paretoFrontier([cheapWeak, priceyStrong], ["price", "rating"]).frontier), ["a", "b"]);
});

test("missing objective value excludes the product from that comparison", () => {
  const withRating = g("a", { price: 100, rating: 4 });
  const noRating = g("b", { price: 50 }); // rating missing
  const r = paretoFrontier([withRating, noRating], ["price", "rating"]);
  assert.deepEqual(ids(r.frontier), ["a"]);
  assert.deepEqual(ids(r.excluded), ["b"]); // b can't be fairly compared on rating
});

test("excluded products are never emitted as frontier solutions", () => {
  const items = [g("a", { price: 10 }), g("b", { price: 20, rating: 5 }), g("c", {})];
  const r = paretoFrontier(items, ["price", "rating"]);
  for (const f of r.frontier) {
    const vals = ["price", "rating"].map((k) => OBJECTIVES[k].get(f));
    assert.ok(vals.every((v) => v != null), "frontier member must have all objective values");
  }
});

test("multi-objective (3D) non-dominance", () => {
  const a = g("a", { price: 100, rating: 5, reviewCount: 50 }); // best rating, mid reviews
  const b = g("b", { price: 200, rating: 4, reviewCount: 500 }); // most reviews
  const c = g("c", { price: 300, rating: 3, reviewCount: 10 }); // worst: dominated by a & b
  const r = paretoFrontier([a, b, c], ["price", "rating", "reviewCount"]);
  assert.deepEqual(ids(r.frontier), ["a", "b"]);
  assert.deepEqual(ids(r.dominated), ["c"]);
});

test("empty and single-product datasets", () => {
  assert.deepEqual(paretoFrontier([], ["price", "rating"]).frontier, []);
  const one = g("a", { price: 100, rating: 4 });
  assert.deepEqual(ids(paretoFrontier([one], ["price", "rating"]).frontier), ["a"]);
});

test("duplicate ids and identical products are handled stably", () => {
  const a = g("a", { price: 100, rating: 4 });
  const a2 = g("a", { price: 100, rating: 4 }); // same id + values
  const r = paretoFrontier([a, a2], ["price", "rating"]);
  assert.equal(r.frontier.length >= 1, true);
});

test("filtering out the dominating product promotes the dominated one", () => {
  const king = g("a", { price: 100, rating: 5 });
  const subject = g("b", { price: 200, rating: 4 });
  assert.deepEqual(ids(paretoFrontier([king, subject], ["price", "rating"]).frontier), ["a"]);
  // remove the dominator -> subject becomes the frontier
  assert.deepEqual(ids(paretoFrontier([subject], ["price", "rating"]).frontier), ["b"]);
});

test("deterministic: same input -> same output", () => {
  const items = [g("a", { price: 100, rating: 5 }), g("b", { price: 200, rating: 4 }), g("c", { price: 150, rating: 4.5 })];
  assert.deepEqual(ids(paretoFrontier(items, ["price", "rating"]).frontier), ids(paretoFrontier(items, ["price", "rating"]).frontier));
});

test("every dominated product is dominated by some frontier member", () => {
  const items = [g("a", { price: 100, rating: 5 }), g("b", { price: 200, rating: 3 }), g("c", { price: 300, rating: 2 }), g("d", { price: 150, rating: 4 })];
  const r = paretoFrontier(items, ["price", "rating"]);
  const fSet = new Set(r.frontier.map((x) => x.id));
  for (const d of r.dominated) {
    const dv = ["price", "rating"].map((k) => OBJECTIVES[k].get(d));
    const hasDominatorInFrontier = r.frontier.some((f) => {
      const fv = ["price", "rating"].map((k) => OBJECTIVES[k].get(f));
      return dominates(fv, dv, [OBJECTIVES.price, OBJECTIVES.rating]);
    });
    assert.ok(hasDominatorInFrontier || fSet.size === 0, `dominated ${d.id} should be beaten by a frontier member`);
  }
});

test("optimized frontier matches the brute-force reference on random datasets", () => {
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let trial = 0; trial < 60; trial++) {
    const n = 1 + Math.floor(rnd() * 25);
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push(g(`t${trial}_${i}`, {
        price: Math.round(rnd() * 50000),
        rating: Math.round(rnd() * 5 * 10) / 10,
        reviewCount: Math.floor(rnd() * 1000),
      }));
    }
    const keys = trial % 2 ? ["price", "rating"] : ["price", "rating", "reviewCount"];
    const mine = ids(paretoFrontier(items, keys).frontier);
    const ref = bruteForceFrontier(items, keys);
    assert.deepEqual(mine, ref, `trial ${trial} diverged from brute force`);
  }
});

test("listingCompleteness reflects present fields", () => {
  assert.equal(listingCompleteness(g("a", { price: 100, rating: 4, originalPrice: 120 })), 100);
  const sparse = listingCompleteness({ ...g("b", { price: 100 }), image: "", sellerName: null, productUrl: null, rating: 0, originalPrice: 0 });
  assert.ok(sparse < 100);
});
