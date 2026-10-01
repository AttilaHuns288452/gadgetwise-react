/* GadgetWise core logic — formulas ported 1:1 from the HTML prototype
   (js/app.js ownIndex/frontier, js/recommendations.js scoring engine). */
import GW from "./data.js";

/* ---------------- formatting ---------------- */
const peso = "\u20B1";
export function money(n) {
  const rounded = Math.round(n * 100) / 100;
  const hasCents = rounded % 1 !== 0;
  return peso + rounded.toLocaleString("en-PH", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

/* ---------------- Performance to Cost index ----------------
   battery 25 (catalog battery spec) + student rating 25 + value 30
   (price vs category median monthly cost) + warranty 20. */
export function ownIndex(g) {
  const med = GW.categoryMedianMonthly(g.category) || GW.monthlyCost(g);
  const value = Math.max(0, Math.min(1, 1 - (GW.monthlyCost(g) / med - 0.6) / 0.8));
  const s =
    Math.min(g.battery / 12, 1) * 25 +
    (g.rating / 5) * 25 +
    value * 30 +
    Math.min((g.value.warrantyYears * 12) / 24, 1) * 20;
  return Math.round(s);
}

/* Index breakdown (0-1 per component) for the detail page */
export function ownIndexParts(g) {
  const med = GW.categoryMedianMonthly(g.category) || GW.monthlyCost(g);
  const value = Math.max(0, Math.min(1, 1 - (GW.monthlyCost(g) / med - 0.6) / 0.8));
  return [
    { key: "battery", label: "Battery", pts: 25, v: Math.min(g.battery / 12, 1) },
    { key: "rating", label: "Student rating", pts: 25, v: g.rating / 5 },
    { key: "value", label: "Value vs category", pts: 30, v: value },
    { key: "warranty", label: "Warranty", pts: 20, v: Math.min((g.value.warrantyYears * 12) / 24, 1) },
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

/* ============================================================
   Transparent weighted scoring engine (no ML). Score out of 100:
     Budget Fit 20 · Academic Suitability 25 · Priorities 50 · Community 5
   ============================================================ */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Normalize a 0-10 spec score to 0-1 relative to its category pool.
// With fewer than 3 points in a pool, fall back to the absolute scale.
function normalize(value, pool) {
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

function academicFit(gadget, useCase, pool) {
  const crit = useCase.criteria;
  let sum = 0, weight = 0;
  for (const [factor, imp] of Object.entries(crit)) {
    const v = factor === "storage" ? gadget.scored.storage : gadget.scored[factor];
    sum += imp * normalize(v, pool[factor]);
    weight += imp;
  }
  return weight ? sum / weight : 0;
}

function ownershipValue(gadget, pool) {
  return 1 - normalize(GW.monthlyCost(gadget), pool._monthly);
}

function buildPools() {
  const pools = {};
  const factors = ["performance", "battery", "portability", "display", "camera", "storage"];
  GW.categories.forEach((c) => {
    const list = GW.gadgetsInCategory(c.id);
    factors.forEach((f) => {
      (pools[f] = pools[f] || []).push(...list.map((g) => g.scored[f]));
    });
    pools._monthly = pools._monthly || [];
    pools._monthly.push(...list.map(GW.monthlyCost));
  });
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
const PUSH = { low: -0.5, medium: 1, high: 2 };

// Rebalance the adjustable 50 points according to user priorities.
function rebalance(priorities) {
  const notes = [];
  const meta = { ...FACTOR_META };
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
  if (dropped.length) notes.push(`${dropped.join(", ")} marked low priority — less weight assigned.`);
  return { weights, notes };
}

// scoreGadget(gadget, opts) -> { total, factors: [{key, label, earned, max, note}] }
function scoreGadget(gadget, opts) {
  const catPools = buildPools();
  const weights = opts.weights;
  const useCase = opts.useCase;
  const budget = opts.budget;
  const factors = [];

  const bf = budgetFit(gadget.price, budget.min, budget.max);
  factors.push({
    key: "budget", label: "Budget Fit", earned: +(bf * 20).toFixed(1), max: 20,
    note: budget.max === Infinity
      ? `${money(gadget.price)} vs. your ${budget.label} budget`
      : (gadget.price > budget.max
        ? `${money(gadget.price)} is ${money(gadget.price - budget.max)} over your budget`
        : `${money(gadget.price)} within your budget`),
  });

  const af = academicFit(gadget, useCase, catPools);
  factors.push({
    key: "academic", label: "Academic Suitability", earned: +(af * 25).toFixed(1), max: 25,
    note: `Matched against "${useCase.label}" requirements`,
  });

  const adjust = [
    ["performance", (g) => g.scored.performance],
    ["battery", (g) => g.scored.battery],
    ["value", (g) => ownershipValue(g, catPools), "vs. category monthly cost"],
    ["portability", (g) => g.scored.portability],
    ["display", (g) => g.scored.display],
    ["camera", (g) => g.scored.camera],
    ["storage", (g) => g.scored.storage],
  ];
  adjust.forEach(([key, get, note]) => {
    const max = weights[key] || 0;
    if (max <= 0.01) return;
    const v01 = key === "value" ? ownershipValue(gadget, catPools) : normalize(get(gadget), catPools[key]);
    factors.push({
      key, label: FACTOR_META[key].label, earned: +(v01 * max).toFixed(1), max: +max.toFixed(1),
      note: note || (typeof get(gadget) === "number" && key !== "value"
        ? `${get(gadget).toFixed(1)} / 10 among comparable gadgets` : ""),
    });
  });

  const cr = clamp01((gadget.rating - 3.2) / 1.8);
  factors.push({
    key: "community", label: "Community Rating", earned: +(cr * 5).toFixed(1), max: 5,
    note: `${gadget.rating.toFixed(1)}★ from ${gadget.reviewCount} student reviews`,
  });

  const total = factors.reduce((n, f) => n + f.earned, 0);
  return { total: Math.round(total), factors };
}

function reasons(gadget, breakdown, opts) {
  const out = [];
  const f = Object.fromEntries(breakdown.factors.map((x) => [x.key, x]));
  if (f.budget.earned >= f.budget.max * 0.85) {
    if (gadget.price < opts.budget.min) out.push(`Under your ${opts.budget.label} budget at ${money(gadget.price)}`);
    else out.push(`Fits your ${opts.budget.label} budget at ${money(gadget.price)}`);
  } else if (f.budget.earned >= f.budget.max * 0.6) out.push(`Close to your budget at ${money(gadget.price)}`);
  if (f.academic && f.academic.earned >= f.academic.max * 0.7) out.push(`Strong fit for ${opts.useCase.label.toLowerCase()}`);
  if (f.value && f.value.max >= 6 && f.value.earned >= f.value.max * 0.7) out.push(`Low cost per month (${money(GW.monthlyCost(gadget))}/month, 36-month window)`);
  if (f.performance && f.performance.earned >= f.performance.max * 0.75) out.push("Strong sustained performance for schoolwork");
  if (f.battery && f.battery.earned >= f.battery.max * 0.75) out.push("Battery comfortably lasts a full class day");
  if (f.display && f.display.earned >= f.display.max * 0.75) out.push("Display is easy on the eyes for long reading");
  if (f.portability && f.portability.max >= 6 && f.portability.earned >= f.portability.max * 0.75) out.push("Light enough for the daily commute");
  if (f.community.earned >= f.community.max * 0.8) out.push(`Highly rated by students (${gadget.rating.toFixed(1)}★)`);
  if (f.budget.earned < f.budget.max * 0.5) out.push("Stretches past your budget — consider the trade-off");
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

/* Stretch rule: gadgets far above the budget ceiling are excluded from
   ranking entirely. "Budget discipline" priority sets the tolerance:
   high -> 5%, medium -> 15%, none/low -> 35% over the ceiling. */
export function recommend(input) {
  const { budget, useCase, priorities } = input;
  const { weights, notes } = rebalance(priorities);
  const stretch = { high: 0.05, medium: 0.15 }[priorities && priorities.budget] || 0.35;
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
      notes.push(`Gadgets above ${money(limit)} (your ceiling + ${Math.round(stretch * 100)}% stretch) are not ranked.`);
    }
    if (priorities && priorities.budget && priorities.budget !== "none") {
      notes.push(`Budget discipline: ${priorities.budget} — stretch tolerance ${Math.round(stretch * 100)}%.`);
    }
  }

  const results = ranked.map((gadget) => {
    const breakdown = scoreGadget(gadget, { weights, useCase, budget });
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
