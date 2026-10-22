import test from "node:test";
import assert from "node:assert/strict";
import { GW, money, ownIndex, frontier, recommend } from "../src/lib.js";

test("catalog scoring stays inside the documented 0–100 bounds", () => {
  assert.ok(GW.gadgets.length >= 10);
  for (const gadget of GW.gadgets) {
    const score = ownIndex(gadget);
    assert.ok(Number.isFinite(score), gadget.id + " score should be finite");
    assert.ok(score >= 0 && score <= 100, gadget.id + " score should be in range");
    assert.ok(gadget.price > 0, gadget.id + " price should be positive");
    assert.ok(Math.abs(GW.monthlyCost(gadget) - gadget.price / 36) < 1e-9);
  }
});

test("currency formatter handles integer pesos and decimal values", () => {
  assert.equal(money(46999), "₱46,999");
  assert.equal(money(1234.5), "₱1,234.50");
});

test("Pareto frontier is nonempty and excludes dominated points", () => {
  const result = frontier(GW.gadgets);
  assert.ok(result.size > 0);
  const indexed = GW.gadgets.map((g) => ({ id: g.id, price: g.price, score: ownIndex(g) }));
  for (const a of indexed.filter((item) => result.has(item.id))) {
    for (const b of indexed) {
      if (a.id === b.id) continue;
      const dominates = b.price <= a.price && b.score >= a.score &&
        (b.price < a.price || b.score > a.score);
      assert.equal(dominates, false, a.id + " is dominated by " + b.id);
    }
  }
});

test("recommendations are ranked by score and expose score breakdowns", () => {
  const result = recommend({
    budget: { min: 10000, max: 20000, label: "₱10,000–₱20,000" },
    useCase: GW.useCases.find((useCase) => useCase.id === "general"),
    priorities: { performance: "high", battery: "medium", budget: "high" },
    category: null,
  });
  assert.ok(result.results.length > 0);
  for (let i = 1; i < result.results.length; i += 1) {
    assert.ok(result.results[i - 1].score >= result.results[i].score);
  }
  for (const row of result.results) {
    const earned = row.breakdown.factors.reduce((sum, factor) => sum + factor.earned, 0);
    assert.ok(Math.abs(Math.round(earned) - row.score) <= 1);
  }
});

test("empty or unknown gadget IDs resolve safely", () => {
  assert.equal(GW.getGadget("__missing_gadgetwise_test__"), null);
  assert.deepEqual(GW.gadgetsByIds(["__missing_gadgetwise_test__"]), []);
});
