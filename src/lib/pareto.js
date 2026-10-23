/**
 * Pareto multi-objective non-dominance.
 *
 * A product is Pareto-optimal (on the frontier) when no OTHER eligible product
 * beats it on every selected objective while being at least as good on all of
 * them. Objectives are explicit: each declares a direction (min|max) and a
 * value getter that returns null when the product lacks that data (so it is
 * excluded from that comparison rather than treated as 0 or neutral).
 *
 * Normalization is NOT required to test dominance — raw validated values are
 * compared in their own direction. Equal values never dominate each other
 * (strict improvement on ≥1 objective is required).
 */

// Objectives genuinely defined by our marketplace data. A missing value is
// null → the product is ineligible for any comparison using that objective.
export const OBJECTIVES = {
  price: { key: "price", label: "Purchase price", unit: "PHP", direction: "min",
    get: (g) => (Number.isFinite(g.price) && g.price > 0 ? g.price : null) },
  monthly: { key: "monthly", label: "Price per month", unit: "/month", direction: "min",
    get: (g) => (Number.isFinite(g.price) && g.price > 0 ? g.price / 36 : null) },
  rating: { key: "rating", label: "Marketplace rating", unit: "/5", direction: "max",
    get: (g) => (Number.isFinite(g.rating) && g.rating > 0 ? g.rating : null) },
  reviewCount: { key: "reviewCount", label: "Review count", unit: "reviews", direction: "max",
    get: (g) => (Number.isFinite(g.reviewCount) && g.reviewCount > 0 ? g.reviewCount : null) },
  completeness: { key: "completeness", label: "Listing completeness", unit: "%", direction: "max",
    get: (g) => listingCompleteness(g) },
};

// Fraction of core listing fields present (0-100). Reuses the same field set
// the enrichment engine scores, so the two never disagree.
export function listingCompleteness(g) {
  const fields = [g.brand, g.model, g.price > 0, g.image, g.rating > 0, g.originalPrice > 0, g.sellerName, g.productUrl];
  const present = fields.filter(Boolean).length;
  return Math.round((present / fields.length) * 100);
}

/** Does `a` dominate `b` on the given objectives (each {direction})? */
export function dominates(aVals, bVals, objs) {
  let strictly = false;
  for (let k = 0; k < objs.length; k++) {
    const av = aVals[k], bv = bVals[k];
    if (objs[k].direction === "max") {
      if (av < bv) return false;
      if (av > bv) strictly = true;
    } else {
      if (av > bv) return false;
      if (av < bv) strictly = true;
    }
  }
  return strictly;
}

/**
 * Generalized N-objective Pareto frontier over a filtered list.
 * Returns { frontier, dominated, excluded, points, objectives }.
 * `excluded` = products missing ≥1 selected objective value (unfair to compare).
 */
export function paretoFrontier(items, objKeys) {
  const objs = objKeys.map((k) => OBJECTIVES[k]).filter(Boolean);
  const eligible = [];
  const excluded = [];
  for (const g of items) {
    const vals = objs.map((o) => o.get(g));
    if (vals.every((v) => v != null && Number.isFinite(v))) eligible.push({ g, vals });
    else excluded.push(g);
  }
  const dominatedIds = new Set();
  for (let i = 0; i < eligible.length; i++) {
    for (let j = 0; j < eligible.length; j++) {
      if (i === j) continue;
      if (dominates(eligible[j].vals, eligible[i].vals, objs)) { dominatedIds.add(eligible[i].g.id); break; }
    }
  }
  const frontier = eligible.filter((e) => !dominatedIds.has(e.g.id));
  return {
    frontier: frontier.map((e) => e.g),
    dominated: eligible.filter((e) => dominatedIds.has(e.g.id)).map((e) => e.g),
    excluded,
    points: eligible, // {g, vals} for every comparable product
    objectives: objs,
  };
}

/** Independent naive reference (no early break, matrix style) — for tests. */
export function bruteForceFrontier(items, objKeys) {
  const objs = objKeys.map((k) => OBJECTIVES[k]).filter(Boolean);
  const rows = items
    .map((g) => ({ g, vals: objs.map((o) => o.get(g)) }))
    .filter((r) => r.vals.every((v) => v != null && Number.isFinite(v)));
  const nonDominated = rows.filter((a) => {
    const dominators = rows.filter((b) => b !== a && dominates(b.vals, a.vals, objs));
    return dominators.length === 0;
  });
  return nonDominated.map((r) => r.g.id).sort();
}

/** Sorted frontier coordinates for drawing the Pareto line (by x, then y). */
export function frontierLine(points, xKey, yKey) {
  const xi = points.objectives.findIndex((o) => o.key === xKey);
  const yi = points.objectives.findIndex((o) => o.key === yKey);
  return points.frontier
    .map((g) => ({ g, x: points.points.find((p) => p.g.id === g.id).vals[xi], y: points.points.find((p) => p.g.id === g.id).vals[yi] }))
    .sort((a, b) => a.x - b.x);
}
