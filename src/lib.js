/* GadgetWise core logic - formulas ported 1:1 from the HTML prototype
   (js/app.js ownIndex/frontier, js/recommendations.js scoring engine). */
import GW from "./data.js";

const peso = "\u20B1";
export function money(n) {
  // `|| 0` normalizes -0 (Math.round(-0) stays -0) so we never print "₱-0".
  const rounded = Math.round(n * 100) / 100 || 0;
  const hasCents = rounded % 1 !== 0;
  return peso + rounded.toLocaleString("en-PH", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

/* Performance to Cost index
   battery 25 (catalog battery spec) + student rating 25 + value 30
   (price vs category median monthly cost) + warranty 20. */
// Missing-data policy: when a required input is unknown (null), EXCLUDE it and
// renormalize the remaining weights to the full 0-100 scale. An unknown is never
// treated as 0 (which would unfairly penalize) or as a guessed value (which
// would fabricate). `ownIndexCoverage` reports how much of the formula had real
// inputs so the UI can say what the score actually measures.
export function ownIndexCoverage(g) {
  return ownIndexParts(g).filter((p) => p.v != null).reduce((n, p) => n + p.pts, 0);
}

export function ownIndex(g) {
  const parts = ownIndexParts(g);
  const avail = parts.filter((p) => p.v != null);
  const weight = avail.reduce((n, p) => n + p.pts, 0);
  if (!weight) return 0;
  const earned = avail.reduce((n, p) => n + p.v * p.pts, 0);
  return Math.round((earned / weight) * 100);
}

/* Index breakdown (0-1 per component) for the detail page */
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

export function ownIndexParts(g) {
  const med = GW.categoryMedianMonthly(g.category) || GW.monthlyCost(g);
  // Unknown price is not "free": it must not win the value component.
  const hasPrice = g.price != null && Number.isFinite(g.price);
  const value = hasPrice && med ? Math.max(0, Math.min(1, 1 - (GW.monthlyCost(g) / med - 0.6) / 0.8)) : null;
  return [
    { key: "battery", label: "Battery", pts: 25, v: isNum(g.battery) ? Math.min(g.battery / 12, 1) : null },
    { key: "rating", label: "Marketplace rating", pts: 25, v: isNum(g.rating) && g.rating > 0 ? g.rating / 5 : null },
    { key: "value", label: "Value vs category", pts: 30, v: value },
    { key: "warranty", label: "Warranty", pts: 20, v: isNum(g.value?.warrantyYears) ? Math.min((g.value.warrantyYears * 12) / 24, 1) : null },
  ];
}

/* Pareto frontier: no other gadget is both cheaper AND higher-indexed */
export function frontier(gadgets) {
  const pts = gadgets.map((g) => ({ id: g.id, p: g.price, s: ownIndex(g) }));
  return new Set(
    pts
      .filter((a) => !pts.some((b) => b !== a && b.p <= a.p && b.s >= a.s && (b.p < a.p || b.s > a.s)))
      .map((a) => a.id)
  );
}

/* Transparent weighted scoring engine (no ML). Score out of 100:
   Budget Fit 20 · Academic Suitability 25 · Priorities 50 · Community 5 */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Normalize a 0-10 spec score to 0-1 relative to its category pool.
// With fewer than 3 points in a pool, fall back to the absolute scale.
function normalize(value, pool) {
  // Missing input is unknown, not zero. Callers exclude null from weights.
  if (value == null || !Number.isFinite(value)) return null;
  if (!pool || pool.length < 3) return clamp01(value / 10);
  const min = Math.min(...pool), max = Math.max(...pool);
  if (max - min < 0.75) return clamp01(value / 10); // near-uniform pool
  return clamp01((value - min) / (max - min));
}

// Budget fit (0-1): comfortably under budget scores best.
function budgetFit(price, min, max) {
  if (max === Infinity) {
    return price >= min ? 1 : clamp01(price / Math.max(min, 1));
  }
  if (price >= min && price <= max) {
    const used = (price - min) / (max - min);
    return 1 - used * 0.15;
  }
  const ceiling = max;
  if (price < min) {
    return clamp01(0.55 + 0.45 * (1 - Math.min(1, (min - price) / Math.max(min, 1))));
  }
  const over = (price - ceiling) / Math.max(ceiling, 1);
  return clamp01(1 - over * 2.2);
}

// Academic fit: a weighted mean over the use-case criteria that have real
// evidence. Returns null when NO criterion has evidence - an unmeasured fit is
// unknown, never a measured zero.
function academicFit(gadget, useCase, pool) {
  const crit = useCase.criteria;
  let sum = 0, weight = 0, total = 0;
  for (const [factor, imp] of Object.entries(crit)) {
    total += imp;
    const v = factor === "storage" ? gadget.scored?.storage : gadget.scored?.[factor];
    const n = normalize(v, pool[factor]);
    if (n == null) continue; // unknown input excluded. Never scored as 0
    sum += imp * n;
    weight += imp;
  }
  if (!weight) return null;
  return { score: sum / weight, supported: weight, total };
}

// Unknown monthly cost (no price) is unknown, not the best possible value.
// Cost per month has no meaningful absolute 0-10 scale, so it is always
// normalized across the pool - a flat pool is neutral, not a perfect score.
function ownershipValue(gadget, pool) {
  if (!isNum(gadget.price) || gadget.price <= 0) return null; // unknown price
  const cost = GW.monthlyCost(gadget);
  const list = pool._monthly;
  if (!Number.isFinite(cost) || !list || !list.length) return null;
  const min = Math.min(...list), max = Math.max(...list);
  if (max - min < 1e-9) return 0.5; // every candidate costs the same → no edge
  return 1 - clamp01((cost - min) / (max - min));
}

// Normalization pools are built from the population actually being ranked, so
// a spec is compared against the gadgets the user is choosing between and not
// against every category in the catalog. Non-finite values never
// enter a pool: one NaN would poison min/max for the whole factor.
function buildPools(list) {
  const pools = {};
  const factors = ["performance", "battery", "portability", "display", "camera", "storage"];
  for (const g of list) {
    for (const f of factors) {
      const v = g.scored?.[f];
      if (Number.isFinite(v)) (pools[f] = pools[f] || []).push(v);
    }
    const monthly = GW.monthlyCost(g);
    if (Number.isFinite(monthly)) (pools._monthly = pools._monthly || []).push(monthly);
  }
  return pools;
}

export const FACTOR_META = {
  performance: { label: "Performance", raw: 20 },
  battery: { label: "Battery life", raw: 15 },
  value: { label: "Cost per month", raw: 15 },
  portability: { label: "Portability", raw: 0 },
  display: { label: "Display", raw: 0 },
  camera: { label: "Camera", raw: 0 },
  storage: { label: "Storage", raw: 0 },
};

/* A custom budget is an EXACT ceiling, not a bracket: the amount the student
   typed is what ranks the products. An empty, zero, or non-numeric
   amount is invalid and returns null. It must never be snapped to a band and
   silently ranked against a budget the student did not choose. */
export function customBudget(amount) {
  const n = typeof amount === "number" ? amount : Number(String(amount ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return { id: `custom-${n}`, label: `Up to ${money(n)}`, min: 0, max: n, exact: true };
}
const PUSH = { low: -0.5, medium: 1, high: 2 };

// Rebalance the adjustable 50 points according to user priorities.
function rebalance(priorities) {
  const notes = [];
  // Deep-clone the shared defaults: the old shallow copy mutated FACTOR_META's
  // nested objects, so one run with Performance=High permanently changed the
  // default weights for every later run. Each run is now independent.
  const meta = Object.fromEntries(Object.entries(FACTOR_META).map(([k, m]) => [k, { ...m }]));
  for (const [f, sel] of Object.entries(priorities || {})) {
    if (!meta[f] || sel === "none") continue;
    const before = meta[f].raw;
    meta[f].raw = Math.max(0, before + (before > 0 ? before : 4) * PUSH[sel] * (before > 0 ? 0.5 : 1));
    if (meta[f].raw === 0 && PUSH[sel] > 0) meta[f].raw = 2;
  }
  const total = Object.values(meta).reduce((n, m) => n + m.raw, 0);
  const weights = {};
  for (const [f, m] of Object.entries(meta)) weights[f] = (m.raw / total) * 50;
  const elevated = Object.entries(priorities || {})
    .filter(([f, s]) => (s === "high" || s === "medium") && FACTOR_META[f])
    .map(([f, s]) => `${FACTOR_META[f].label} (${s})`);
  if (elevated.length) notes.push(`Priorities shifted weight toward ${elevated.join(", ")}.`);
  const dropped = Object.entries(priorities || {})
    .filter(([f, s]) => s === "low" && FACTOR_META[f])
    .map(([f]) => FACTOR_META[f].label);
  if (dropped.length) notes.push(`${dropped.join(", ")} marked low priority. Less weight assigned.`);
  return { weights, notes };
}

// scoreGadget(gadget, opts, pools) -> {
//   total, supported, coverage, unknown, factors: [{key,label,earned,max,note}]
// }
// Every factor is either MEASURED (it has evidence and contributes points) or
// UNKNOWN (it carries weight but the catalog has no evidence for it). An
// unknown factor is never scored as 0 - a missing measurement is not a bad
// result - so it is excluded and reported, and the score carries its coverage
// so the UI can say the score is partial instead of implying it is complete
//. `supported` is how many of the nominal 100 points had evidence.
function scoreGadget(gadget, opts, pools) {
  const weights = opts.weights;
  const useCase = opts.useCase;
  const budget = opts.budget;
  const factors = [];
  const unknown = [];

  const priceKnown = isNum(gadget.price) && gadget.price > 0;
  if (priceKnown) {
    const bf = budgetFit(gadget.price, budget.min, budget.max);
    factors.push({
      key: "budget", label: "Budget Fit", earned: +(bf * 20).toFixed(1), max: 20,
      note: budget.max === Infinity
        ? `${money(gadget.price)} vs. your ${budget.label} budget`
        : (gadget.price > budget.max
          ? `${money(gadget.price)} is ${money(gadget.price - budget.max)} over your budget`
          : `${money(gadget.price)} within your budget`),
    });
  } else {
    unknown.push({ key: "budget", label: "Budget Fit", max: 20, note: "Price unknown" });
  }

  const af = academicFit(gadget, useCase, pools);
  if (af) {
    const partial = af.supported < af.total;
    factors.push({
      key: "academic", label: "Academic Suitability", earned: +(af.score * 25).toFixed(1), max: 25,
      note: `Matched against "${useCase.label}" requirements` +
        (partial ? ` (${af.supported} of ${af.total} criteria have data)` : ""),
    });
  } else {
    unknown.push({ key: "academic", label: "Academic Suitability", max: 25, note: "No scored specs to match" });
  }

  const adjust = [
    ["performance", (g) => g.scored?.performance],
    ["battery", (g) => g.scored?.battery],
    ["value", (g) => ownershipValue(g, pools), "vs. monthly cost among the gadgets you are choosing between"],
    ["portability", (g) => g.scored?.portability],
    ["display", (g) => g.scored?.display],
    ["camera", (g) => g.scored?.camera],
    ["storage", (g) => g.scored?.storage],
  ];
  adjust.forEach(([key, get, note]) => {
    const max = weights[key] || 0;
    if (max <= 0.01) return; // this factor carries no weight in this run
    // Spec factors are 0-10 raw values: normalize them against the pool.
    // "value" is already a 0-1 pool-relative score from ownershipValue().
    const raw = key === "value" ? get(gadget) : normalize(get(gadget), pools[key]);
    if (raw == null) {
      unknown.push({ key, label: FACTOR_META[key].label, max: +max.toFixed(1), note: "No data in the catalog" });
      return;
    }
    const spec = get(gadget);
    const v = typeof spec === "number" && key !== "value"
      ? `${spec.toFixed(1)} / 10, normalized against the gadgets you are choosing between`
      : "";
    factors.push({
      key, label: FACTOR_META[key].label, earned: +(raw * max).toFixed(1), max: +max.toFixed(1),
      note: note || v,
    });
  });

  // A rating of 0 means "no reviews yet" (the marketplace loader uses 0 for
  // unknown), not "rated zero stars" - so it is unknown, never a measured 0.
  if (isNum(gadget.rating) && gadget.rating > 0) {
    const cr = clamp01((gadget.rating - 3.2) / 1.8);
    factors.push({
      key: "community", label: "Community Rating", earned: +(cr * 5).toFixed(1), max: 5,
      note: `${gadget.rating.toFixed(1)}★ from ${gadget.reviewCount} student reviews`,
    });
  } else {
    unknown.push({ key: "community", label: "Community Rating", max: 5, note: "No student reviews yet" });
  }

  const total = factors.reduce((n, f) => n + f.earned, 0);
  const supported = factors.reduce((n, f) => n + f.max, 0);
  return {
    total: Math.round(total),
    supported: +supported.toFixed(1),
    coverage: +(supported / 100).toFixed(3),
    unknown,
    factors,
  };
}

function reasons(gadget, breakdown, opts) {
  const out = [];
  const f = Object.fromEntries(breakdown.factors.map((x) => [x.key, x]));
  // A factor can be absent (unknown) - never claim a reason from missing data.
  if (f.budget && f.budget.earned >= f.budget.max * 0.85) {
    if (gadget.price < opts.budget.min) out.push(`Under your ${opts.budget.label} budget at ${money(gadget.price)}`);
    else out.push(`Fits your ${opts.budget.label} budget at ${money(gadget.price)}`);
  } else if (f.budget && f.budget.earned >= f.budget.max * 0.6) out.push(`Close to your budget at ${money(gadget.price)}`);
  if (f.academic && f.academic.earned >= f.academic.max * 0.7) out.push(`Strong fit for ${opts.useCase.label.toLowerCase()}`);
  if (f.value && f.value.max >= 6 && f.value.earned >= f.value.max * 0.7) out.push(`Low cost per month (${money(GW.monthlyCost(gadget))}/month, 36-month window)`);
  if (f.performance && f.performance.earned >= f.performance.max * 0.75) out.push("Strong sustained performance for schoolwork");
  if (f.battery && f.battery.earned >= f.battery.max * 0.75) out.push("Battery comfortably lasts a full class day");
  if (f.display && f.display.earned >= f.display.max * 0.75) out.push("Display is easy on the eyes for long reading");
  if (f.portability && f.portability.max >= 6 && f.portability.earned >= f.portability.max * 0.75) out.push("Light enough for the daily commute");
  if (f.community && f.community.earned >= f.community.max * 0.8) out.push(`Highly rated by students (${gadget.rating.toFixed(1)}★)`);
  if (f.budget && f.budget.earned < f.budget.max * 0.5) out.push("Stretches past your budget. Consider the trade-off");
  return out.slice(0, 6);
}

function strengthsWeaknesses(gadget, opts) {
  const s = gadget.strengths.slice(0, 3);
  const w = gadget.weaknesses.slice(0, 3);
  if (opts.priorities) {
    const highP = Object.entries(opts.priorities).filter(([, v]) => v === "high").map(([k]) => k);
    for (const p of highP) {
      const map = { performance: "Performance", battery: "Battery", display: "Display", camera: "Camera", storage: "Storage", portability: "Portability", value: "Value" };
      const hit = gadget.weaknesses.find((x) => x.toLowerCase().includes((map[p] || "").toLowerCase()));
      if (hit) { w.unshift(hit); break; }
    }
  }
  return { strengths: [...new Set(s)], weaknesses: [...new Set(w)].slice(0, 3) };
}

// stretch rule: gadgets far above the budget ceiling drop out of ranking
// entirely. Tolerance follows the budget-discipline priority (high 5%, medium
// 15%, else 35% over). A custom budget is exact - no bracket snapping.
export function recommend(input) {
  const { budget, useCase, priorities } = input;
  const { weights, notes } = rebalance(priorities);
  // An exact budget is a number the student typed: it is the hard ceiling, so
  // no stretch is applied. A bracket is a rough range, so the documented
  // budget-discipline stretch applies to it.
  const stretch = budget.exact ? 0 : { high: 0.05, medium: 0.15 }[priorities && priorities.budget] || 0.35;
  const pool = input.category
    ? GW.gadgetsInCategory(input.category)
    : (GW.gadgetsInCategory(useCase.categories[0]).length > 2
      ? useCase.categories.flatMap((c) => GW.gadgetsInCategory(c))
      : GW.gadgets);

  let ranked = pool;
  let hiddenCount = 0;
  if (budget.max !== Infinity) {
    const limit = budget.max * (1 + stretch);
    ranked = pool.filter((g) => g.price <= limit);
    hiddenCount = pool.length - ranked.length;
    if (hiddenCount > 0) {
      notes.push(
        budget.exact
          ? `Gadgets above ${money(limit)} (your exact budget) are not ranked.`
          : `Gadgets above ${money(limit)} (your ceiling + ${Math.round(stretch * 100)}% stretch) are not ranked.`,
      );
    }
    if (!budget.exact && priorities && priorities.budget && priorities.budget !== "none") {
      notes.push(`Budget discipline: ${priorities.budget}. Stretch tolerance ${Math.round(stretch * 100)}%.`);
    }
  }

  // Pools come from the population actually being ranked, so a spec is
  // compared against the gadgets the user is choosing between.
  const pools = buildPools(ranked);

  const results = ranked.map((gadget) => {
    const breakdown = scoreGadget(gadget, { weights, useCase, budget }, pools);
    return {
      gadget,
      breakdown,
      score: breakdown.total,
      reasons: reasons(gadget, breakdown, { budget, useCase, priorities }),
      ...strengthsWeaknesses(gadget, { priorities }),
    };
  });
  results.sort((a, b) => b.score - a.score);
  return { results, weights, notes, hiddenCount, stretchLimit: budget.max === Infinity ? null : budget.max * (1 + stretch) };
}

export { GW };


// Metrics derived from real listing fields only - anything we can't verify
// comes back as unavailable instead of a guessed number.
export const ENRICH_VERSION = 1;

const coreFields = (g) => ({
  brand: !!g.brand,
  model: !!g.model,
  price: isNum(g.price) && g.price > 0,
  image: !!g.image,
  rating: isNum(g.rating) && g.rating > 0,
  originalPrice: isNum(g.originalPrice) && g.originalPrice > 0,
  seller: !!g.sellerName,
  productUrl: !!g.productUrl,
});

/** One entry per metric: {id,label,value,unit,status,method|reason,note?}. */
export function enrich(g) {
  const out = [];
  const peers = GW.gadgetsInCategory(g.category).filter((x) => isNum(x.price) && x.price > 0);
  const n = peers.length;

  // 1. Price competitiveness - where this price sits among category peers.
  if (isNum(g.price) && g.price > 0 && n >= 3) {
    const cheaperOrEq = peers.filter((x) => x.price >= g.price).length;
    const pct = Math.round((cheaperOrEq / n) * 100); // % of peers priced at or above this
    out.push({
      id: "priceCompetitiveness", label: "Price competitiveness", value: pct, unit: "%",
      status: "calculated",
      // a gadget may carry no category (incomplete listing); never let the
      // metric text throw and blank the whole detail page
      method: `Priced at or below ${pct}% of ${n} ${String(g.category || "product").toLowerCase()} listings`,
      note: "Relative price position only, not product quality.",
    });
  } else {
    out.push({ id: "priceCompetitiveness", label: "Price competitiveness", value: null, unit: "/100",
      status: "unavailable", reason: n < 3 ? `Only ${n} comparable listing(s). Too small a sample` : "No valid price" });
  }

  // 2. Discount - only when both prices are valid and reference > current.
  if (isNum(g.price) && g.price > 0 && isNum(g.originalPrice) && g.originalPrice > g.price) {
    const pct = ((g.originalPrice - g.price) / g.originalPrice) * 100;
    out.push({ id: "discount", label: "Discount vs listed reference", value: Math.round(pct), unit: "%",
      status: "calculated", method: `(${money(g.originalPrice)} - ${money(g.price)}) / ${money(g.originalPrice)}`,
      note: "Compares to the seller's listed reference price, not a verified historical price." });
  } else {
    out.push({ id: "discount", label: "Discount vs listed reference", value: null, unit: "%",
      status: "unavailable", reason: "No valid higher reference price from the listing" });
  }

  // 3. Price per month - amortized allocation over a fixed 36-month window.
  if (isNum(g.price) && g.price > 0) {
    out.push({ id: "pricePerMonth", label: "Purchase price per month", value: Math.round((g.price / 36) * 100) / 100, unit: "/month",
      status: "estimated", method: "Price \u00f7 36 months (fixed allocation, not a lifespan or total-cost claim)" });
  } else {
    out.push({ id: "pricePerMonth", label: "Purchase price per month", value: null, unit: "/month",
      status: "unavailable", reason: "No valid price" });
  }

  // 4. Listing completeness - how much the listing actually tells us.
  const fields = coreFields(g);
  const present = Object.values(fields).filter(Boolean).length;
  out.push({ id: "listingCompleteness", label: "Listing completeness", value: Math.round((present / Object.keys(fields).length) * 100), unit: "%",
    status: "calculated", method: `${present}/${Object.keys(fields).length} core fields present`,
    note: "Measures how complete the listing is, not how good the product is." });

  // 5. Marketplace rating (source-provided).
  if (isNum(g.rating) && g.rating > 0) {
    out.push({ id: "rating", label: "Marketplace rating", value: Math.round(g.rating * 10) / 10, unit: "/5",
      status: "source", method: "Provided by the marketplace listing" });
    out.push({ id: "reviewCount", label: "Marketplace review count", value: g.reviewCount ?? 0, unit: "reviews",
      status: "source", method: "Provided by the marketplace listing" });
  } else {
    out.push({ id: "rating", label: "Marketplace rating", value: null, unit: "/5", status: "unavailable", reason: "Listing provides no rating" });
  }

  // 6. Evidence coverage - how many scoring factors real data supports.
  const cov = ownIndexCoverage(g);
  out.push({ id: "coverage", label: "Evidence coverage", value: cov, unit: "%",
    status: "calculated", method: "Share of scoring weight backed by real inputs (missing factors are excluded, never zeroed)",
    note: "Higher = the score rests on more real evidence." });

  return out;
}
