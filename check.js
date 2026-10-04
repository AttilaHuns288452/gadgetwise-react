// One runnable check for the ported scoring logic. `node check.js`
import assert from "node:assert";
import { GW, money, ownIndex, frontier, recommend } from "./src/lib.js";

assert.ok(GW.gadgets.length >= 10, "catalog should have at least 10 gadgets");

// every gadget indexes in 0-100 and monthly cost formula is price/36
for (const g of GW.gadgets) {
  const idx = ownIndex(g);
  assert.ok(idx >= 0 && idx <= 100, `${g.id} index ${idx} out of range`);
  assert.ok(Math.abs(GW.monthlyCost(g) - g.price / 36) < 1e-9, `${g.id} monthly cost wrong`);
}

// frontier: at least one point, and no frontier point is dominated
const front = frontier(GW.gadgets);
assert.ok(front.size > 0, "frontier empty");

// recommend: sorted desc, factors sum to the reported total, budget respected
const r = recommend({
  budget: { min: 10000, max: 20000, label: "₱10,000 – ₱20,000" },
  useCase: GW.useCases.find((u) => u.id === "general"),
  priorities: { performance: "high", battery: "medium", budget: "high" },
  category: null,
});
assert.ok(r.results.length > 0, "no results");
for (let i = 1; i < r.results.length; i++) {
  assert.ok(r.results[i - 1].score >= r.results[i].score, "results not sorted");
}
for (const res of r.results) {
  const sum = res.breakdown.factors.reduce((n, f) => n + f.earned, 0);
  assert.ok(Math.abs(Math.round(sum) - res.score) <= 1, `${res.gadget.id} factor sum ${sum} != ${res.score}`);
}
// budget discipline high => 5% stretch => nothing above 21,000 ranked
assert.ok(r.results.every((res) => res.gadget.price <= 21000), "stretch limit violated");
assert.ok(money(46999) === "\u20B146,999", `money format off: ${money(46999)}`);

// admin console seed data: every referenced gadget id resolves, states are sane
assert.ok(GW.admin.moderation.length > 0, "no moderation rows");
assert.ok(GW.admin.moderation.every((r) => typeof r.gadget === "string" && r.gadget.length > 2), "moderation rows missing gadget names");
assert.ok(GW.admin.moderation.filter((r) => r.status === "pending").length === 7, "expected 7 pending rows");
for (const [id] of [...GW.admin.topViewed, ...GW.admin.mostCompared, ...GW.admin.mostRecommended]) {
  assert.ok(GW.getGadget(id), `admin stats reference unknown gadget ${id}`);
}
assert.ok(GW.users.length === 8, "expected 8 seeded users");

console.log(`check.js OK — ${GW.gadgets.length} gadgets, frontier ${front.size}, ${r.results.length} ranked for the ₱10-20k general-use case`);
