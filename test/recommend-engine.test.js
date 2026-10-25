/**
 * Regression tests for the QA findings on the recommendation engine.
 *
 * The fictional fixture catalog is loaded here the same way check.js does it:
 * the fixture is test-only and never ships in the production bundle.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../test/fixture.js";
import GW from "../src/data.js";
import { recommend, FACTOR_META, customBudget } from "../src/lib.js";

const page = (p) => readFileSync(p, "utf8");

const useCase = (id) => GW.useCases.find((u) => u.id === id);
const band = (id) => GW.budgetBands.find((b) => b.id === id);
const scores = (r) => r.results.map((x) => x.score);

/* --- GW-03: a custom budget is an EXACT ceiling, not a bracket --------- */

test("GW-03: a custom budget keeps the exact amount instead of snapping to a band", () => {
  const b = customBudget("15000");
  assert.ok(b, "a valid custom amount produces a budget");
  assert.equal(b.max, 15000, "the exact amount is the ceiling");
  assert.equal(b.min, 0);
  assert.equal(b.exact, true, "it is marked exact so no band is implied");
  // 15000 used to land in the 10000-20000 band, whose ceiling is 20000.
  assert.notEqual(b.max, 20000);
});

test("GW-03: an empty, zero, or non-numeric custom budget is rejected", () => {
  assert.equal(customBudget(""), null, "empty is invalid");
  assert.equal(customBudget("0"), null, "zero is invalid");
  assert.equal(customBudget("   "), null, "whitespace is invalid");
  assert.equal(customBudget("abc"), null, "text is invalid");
  assert.equal(customBudget(-5), null, "a negative amount is invalid");
  assert.equal(customBudget(null), null);
  assert.equal(customBudget(undefined), null);
});

test("GW-03: an exact budget ranks only products at or under that ceiling", () => {
  const r = recommend({
    category: "smartphones",
    budget: customBudget("15000"),
    useCase: useCase("general"),
    priorities: {},
  });
  assert.ok(r.results.length > 0, "some products are ranked");
  for (const res of r.results) {
    assert.ok(res.gadget.price <= 15000, `${res.gadget.id} at ${res.gadget.price} is over the exact budget`);
  }
  // The exact ceiling is also the stretch limit — no budget-discipline slack.
  assert.equal(r.stretchLimit, 15000);
  // A ₱15,000 budget must not rank the ₱17,990 phone the old 10-20k band
  // ceiling (₱20,000) would have admitted.
  assert.ok(
    !r.results.some((x) => x.gadget.price > 15000),
    "the old band ceiling must not leak into an exact budget",
  );
});

test("GW-03: a wider exact budget ranks a superset of the narrow one", () => {
  const narrow = recommend({
    category: "smartphones",
    budget: customBudget("15000"),
    useCase: useCase("general"),
    priorities: {},
  });
  const wide = recommend({
    category: "smartphones",
    budget: customBudget("20000"),
    useCase: useCase("general"),
    priorities: {},
  });
  const narrowIds = new Set(narrow.results.map((r) => r.gadget.id));
  for (const res of wide.results) {
    if (res.gadget.price <= 15000) {
      assert.ok(narrowIds.has(res.gadget.id), "a product under the narrow budget is also under the wide one");
    }
  }
  assert.ok(
    wide.results.some((r) => r.gadget.price > 15000),
    "the wider budget admits products the narrow one excluded",
  );
});

/* --- GW-04: the engine must be deterministic across runs ---------------- */

test("GW-04: running default, then modified, then default again gives identical scores", () => {
  const args = {
    category: "laptops",
    budget: band("20-40k"),
    useCase: useCase("general"),
  };
  const first = recommend({ ...args, priorities: { performance: "none" } });
  const modified = recommend({ ...args, priorities: { performance: "high" } });
  const again = recommend({ ...args, priorities: { performance: "none" } });

  assert.deepEqual(scores(again), scores(first), "a prior run must not change the next default run");
  assert.deepEqual(
    again.results.map((r) => r.gadget.id),
    first.results.map((r) => r.gadget.id),
    "the ranking order is stable too",
  );
  assert.notDeepEqual(scores(modified), scores(first), "the modified run really did change the scores");
});

test("GW-04: the shared FACTOR_META defaults are never mutated by a run", () => {
  const snapshot = JSON.stringify(FACTOR_META);
  recommend({
    category: "laptops",
    budget: band("20-40k"),
    useCase: useCase("general"),
    priorities: { performance: "high", battery: "high", display: "medium", value: "low" },
  });
  assert.equal(JSON.stringify(FACTOR_META), snapshot, "a run must not write into the shared defaults");
  assert.equal(FACTOR_META.performance.raw, 20, "the default weight is still the default");
});

test("GW-04: the same input always gives the same output", () => {
  const args = {
    category: "smartphones",
    budget: band("10-20k"),
    useCase: useCase("general"),
    priorities: { performance: "high" },
  };
  const a = recommend({ ...args });
  const b = recommend({ ...args });
  assert.deepEqual(scores(b), scores(a));
});

/* --- GW-05: unknown evidence is not a measured zero -------------------- */

test("GW-05: a gadget with no evidence is scored out of its supported points, not 100", async () => {
  // A real marketplace listing: price and rating only, no curated specs.
  const blank = {
    id: "blank-listing",
    brand: "Acme",
    model: "Blank Listing",
    category: "laptops",
    price: 12000,
    rating: 0, // no reviews yet -> unknown, not "rated zero"
    reviewCount: 0,
    scored: { performance: null, battery: null, portability: null, display: null, camera: null, storage: null },
    value: { warrantyYears: null },
    strengths: [],
    weaknesses: [],
  };
  const before = GW.gadgets.length;
  GW.gadgets.push(blank);
  try {
    const r = recommend({
      category: "laptops",
      budget: band("20-40k"),
      useCase: useCase("general"),
      priorities: {},
    });
    const hit = r.results.find((x) => x.gadget.id === "blank-listing");
    assert.ok(hit, "the listing is ranked");
    const bd = hit.breakdown;
    // The academic factor has no evidence at all: it must be UNKNOWN, never a
    // measured 0 out of 25.
    const academic = bd.factors.find((f) => f.key === "academic");
    assert.equal(academic, undefined, "an unmeasured factor is not in the scored factors");
    const unknownAcademic = bd.unknown.find((u) => u.key === "academic");
    assert.ok(unknownAcademic, "the unmeasured factor is reported as unknown");
    assert.equal(unknownAcademic.max, 25, "and it says how many points it carried");
    // The score is presented out of the points that actually had evidence.
    assert.ok(bd.supported < 100, `supported points ${bd.supported} must be under 100`);
    assert.equal(bd.coverage, +(bd.supported / 100).toFixed(3));
    assert.ok(bd.coverage < 1, "the score is marked incomplete");
  } finally {
    GW.gadgets.length = before;
  }
});

test("GW-05: a measured zero is different from an unknown", () => {
  // A catalog product with a real (bad) spec: scored 0 on performance, which
  // IS a measurement, and must stay in the scored factors.
  const zeroed = {
    id: "zero-spec",
    brand: "Acme",
    model: "Zero Spec",
    category: "laptops",
    price: 12000,
    rating: 4,
    reviewCount: 10,
    scored: { performance: 0, battery: 5, portability: 5, display: 5, camera: 5, storage: 5 },
    value: { warrantyYears: 1 },
    strengths: [],
    weaknesses: [],
  };
  const before = GW.gadgets.length;
  GW.gadgets.push(zeroed);
  try {
    const r = recommend({
      category: "laptops",
      budget: band("20-40k"),
      useCase: useCase("general"),
      priorities: { performance: "high" },
    });
    const hit = r.results.find((x) => x.gadget.id === "zero-spec");
    assert.ok(hit);
    const perf = hit.breakdown.factors.find((f) => f.key === "performance");
    assert.ok(perf, "a measured 0 is a real factor, not an unknown");
    assert.equal(perf.earned, 0, "it earns zero points");
    assert.ok(!hit.breakdown.unknown.some((u) => u.key === "performance"), "and it is not reported as unknown");
  } finally {
    GW.gadgets.length = before;
  }
});

test("GW-05: the reported total always equals the sum of the scored factors", () => {
  const r = recommend({
    category: "smartphones",
    budget: band("10-20k"),
    useCase: useCase("general"),
    priorities: { performance: "high", camera: "high" },
  });
  for (const res of r.results) {
    const sum = res.breakdown.factors.reduce((n, f) => n + f.earned, 0);
    assert.ok(Math.abs(Math.round(sum) - res.score) <= 1, `factors ${sum} != score ${res.score}`);
    const maxSum = res.breakdown.factors.reduce((n, f) => n + f.max, 0);
    assert.ok(Math.abs(maxSum - res.breakdown.supported) <= 0.2, "supported points match the scored factors");
  }
});

/* --- GW-06: normalization pools follow the ranked population ----------- */

test("GW-06: a spec is normalized against the ranked population, not the whole catalog", () => {
  // Two laptops are ranked. A phone with a far better battery sits in the
  // catalog but is NOT a candidate, so it must not move the battery scale.
  const before = GW.gadgets.length;
  const extra = {
    id: "laptop-weak-battery",
    brand: "Acme",
    model: "Weak Laptop",
    category: "laptops",
    price: 20000,
    rating: 4,
    reviewCount: 5,
    scored: { performance: 5, battery: 2, portability: 5, display: 5, camera: 5, storage: 5 },
    value: { warrantyYears: 1 },
    strengths: [],
    weaknesses: [],
  };
  GW.gadgets.push(extra);
  try {
    const run = () =>
      recommend({
        category: "laptops",
        budget: band("20-40k"),
        useCase: useCase("general"),
        priorities: { battery: "high" },
      }).results.find((r) => r.gadget.id === "laptop-weak-battery");
    const withExtra = run();
    assert.ok(withExtra, "the laptop is ranked");
    const battery = withExtra.breakdown.factors.find((f) => f.key === "battery");
    assert.ok(battery, "battery is scored");
    // In the laptop pool the battery range is 2..10, so 2 normalizes to 0.
    assert.equal(battery.earned, 0, "the weakest laptop in the pool scores 0 on battery");
  } finally {
    GW.gadgets.length = before;
  }
});

test("GW-06: the cost-per-month note names the population it compares against", () => {
  const r = recommend({
    category: "laptops",
    budget: band("20-40k"),
    useCase: useCase("general"),
    priorities: { value: "high" },
  });
  const value = r.results[0].breakdown.factors.find((f) => f.key === "value");
  assert.ok(value, "cost per month is scored");
  assert.match(value.note, /choosing between|comparable/i, "the note says what the comparison is against");
  assert.ok(!/category monthly cost/i.test(value.note), "the old 'vs. category monthly cost' claim is gone");
});

/* --- GW-07: the UI renders the engine's real weights and factors -------- */

test("GW-07: the Quiz page renders the engine weights and the real factor breakdown", () => {
  const src = page("src/pages/Quiz.jsx");
  // The chips must come from engine.weights, not from a module-level default.
  assert.ok(/engine\.weights/.test(src), "the weight chips read engine.weights");
  assert.ok(!/ADJ_CHIPS/.test(src), "the module-level ADJ_CHIPS default list is gone");
  // The breakdown must render the engine's factors, not raw catalog specs.
  assert.ok(/breakdown\.factors/.test(src), "the breakdown renders breakdown.factors");
  assert.ok(!/SCORE_BARS/.test(src), "the raw spec bar list is gone");
  // Unknown factors must be visible, not silently dropped.
  assert.ok(/breakdown\.unknown/.test(src), "unknown factors are shown");
});

/* --- GW-09: the results memo follows the catalog, and zero results show -- */

test("GW-09: the results memo depends on the catalog size so it recomputes when it settles", () => {
  const src = page("src/pages/Quiz.jsx");
  assert.ok(/catalogSize/.test(src), "the memo is keyed on the catalog size");
  assert.ok(/catalogSize\]/.test(src), "catalogSize is in the dependency list");
  // A zero-result run must render something actionable, not a blank page.
  assert.ok(/results\.length === 0/.test(src), "an empty result set is handled");
  assert.ok(/No products fit this budget|Nothing to rank yet/.test(src), "with an actionable message");
});
