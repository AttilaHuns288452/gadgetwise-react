// The one seam every product page reads: fills GW.gadgets with real Lazada
// listings. Unknown specs map to null and the scorer skips them, so a product
// is never scored on invented data.

import GW from "../data.js";
import { toGadget } from "./marketplace.js";
import { loadProducts, loadCategories } from "./store.js";

// Bump after catalog-data integrity changes so an old browser never revives
// stale or placeholder-heavy marketplace results.
const CACHE_PREFIX = "gw.catalog.v4.";
// ponytail: 7-day cache + 1 page/category. The API is a 50-req/month BASIC plan,
// so we fetch rarely and lean on the cache; stale data beats an empty catalog.
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const PAGES_PER_CATEGORY = 1;

// category id -> Lazada query. Buckets are assigned by query (reliable), not
// title heuristics, so each tab has a real, even distribution.
const CATEGORY_QUERIES = [
  ["smartphones", "smartphone"],
  ["laptops", "laptop"],
  ["tablets", "tablet"],
  ["headphones", "headphones"],
  ["powerbanks", "power bank"],
  ["smartwatches", "smartwatch"],
];

// admin-managed categories override the built-ins by slug; rows merge over the
// defaults so one admin edit never deletes the rest
// merge admin rows over the defaults - pure, and a row with no query still
// counts as a category
export function mergeCategoryPlan(base, rows) {
  const byId = new Map(base.map((c) => [c.id, { ...c }]));
  for (const r of rows || []) {
    const slug = String(r.slug || "").trim();
    if (!slug) continue;
    const query = String(r.query || "").trim();
    const existing = byId.get(slug);
    if (existing) {
      if (r.name) existing.name = r.name;
      if (query) existing.query = query;
    } else if (r.name) {
      byId.set(slug, { id: slug, name: r.name, query });
    }
  }
  const list = [...byId.values()];
  return { list, queries: list.filter((c) => c.query).map((c) => [c.id, c.query]) };
}

async function categoryPlan() {
  const base = CATEGORY_QUERIES.map(([id, query]) => ({
    id,
    name: GW.getCategory(id)?.name || id,
    query,
  }));
  try {
    const rows = (await loadCategories()).rows || [];
    const { list, queries } = mergeCategoryPlan(base, rows);
    // every page reads GW.categories (Home tiles, filters, quiz cases), so the
    // admin list has to land there to actually influence the public site
    GW.categories = list.map((c) => ({ id: c.id, name: c.name }));
    return { list, queries };
  } catch {
    return { list: base, queries: CATEGORY_QUERIES };
  }
}

// short stable hash of the category plan, part of the cache key so an admin
// edit doesn't serve stale products
export function planHash(list = []) {
  const s = list
    .map((c) => `${c.id}|${c.name || ""}|${c.query || ""}`)
    .sort()
    .join(";");
  // FNV-1a (32-bit) - a cache key only needs to be stable and collision-light.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

async function fetchCategory(catId, query) {
  // ok/error are tracked per category: a failed category must be visible, not
  // silently dropped.
  const out = { items: [], stale: false, staleFrom: null, ok: true, error: null };
  for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
    const qs = new URLSearchParams({ q: query, marketplace: "ph", page: String(page) });
    let r, d;
    try {
      r = await fetch(`/api/lazada/search?${qs}`);
    } catch {
      out.ok = false;
      out.error = "network error";
      continue; // network blip on one page: keep the rest
    }
    if (!r.ok) {
      out.ok = false;
      out.error = `upstream ${r.status}`;
      continue; // e.g. 429 on one page: keep the rest
    }
    try {
      d = await r.json();
    } catch {
      out.ok = false;
      out.error = "bad response";
      continue;
    }
    for (const p of d.products || []) out.items.push({ ...p, _cat: catId });
    // the handler serves a real snapshot when the provider is unavailable and
    // marks it stale - surface that so cached rows are never sold as live
    if (d.stale) { out.stale = true; out.staleFrom = d.staleFrom || out.staleFrom; }
  }
  return out;
}

function toCatalogGadget(p) {
  const g = toGadget(p);
  g.category = p._cat; // bucket by the category we searched, not title guess
  return g;
}

// price-range parsing: an empty input means "no bound" (that's what made a
// ₱120,000 ceiling get ignored); min/max are null when unbounded
export function parsePriceRange(minRaw, maxRaw) {
  const parse = (raw, label) => {
    const s = String(raw ?? "").trim();
    if (s === "") return { value: null, error: null };
    const n = Number(s);
    if (!Number.isFinite(n)) return { value: null, error: `${label} must be a number.` };
    if (n < 0) return { value: null, error: `${label} cannot be negative.` };
    return { value: n, error: null };
  };
  const lo = parse(minRaw, "Minimum price");
  if (lo.error) return { min: null, max: null, error: lo.error };
  const hi = parse(maxRaw, "Maximum price");
  if (hi.error) return { min: null, max: null, error: hi.error };
  if (lo.value != null && hi.value != null && lo.value > hi.value) {
    return { min: null, max: null, error: "Minimum price cannot be higher than the maximum price." };
  }
  return { min: lo.value, max: hi.value, error: null };
}

// unknown price can't satisfy a bound - excluded, not counted as ₱0
export function withinPriceRange(price, min, max) {
  if (typeof price !== "number" || !Number.isFinite(price)) return false;
  if (min != null && price < min) return false;
  if (max != null && price > max) return false;
  return true;
}

/** Sort key for price sorts: unknown prices go last, never first as ₱0. */
export function priceSortValue(g) {
  const p = g?.price;
  return typeof p === "number" && Number.isFinite(p) ? p : Number.POSITIVE_INFINITY;
}

// stats counted from the real loaded listings
export function catalogStats(gadgets = GW.gadgets) {
  const byCat = {};
  // Only listings with a KNOWN price count toward the average: an unknown
  // price must not drag it toward zero.
  const prices = [];
  let withRating = 0;
  let ratingSum = 0;
  for (const g of gadgets) {
    byCat[g.category] = (byCat[g.category] || 0) + 1;
    if (typeof g.price === "number" && Number.isFinite(g.price) && g.price > 0) prices.push(g.price);
    if (g.rating > 0) {
      withRating += 1;
      ratingSum += g.rating;
    }
  }
  const priceSum = prices.reduce((n, p) => n + p, 0);
  return {
    total: gadgets.length,
    categories: Object.entries(byCat)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    avgPrice: prices.length ? Math.round(priceSum / prices.length) : 0,
    pricedCount: prices.length,
    withRating,
    avgRating: withRating ? Math.round((ratingSum / withRating) * 10) / 10 : 0,
  };
}

// merge per-category results; a failed category keeps its old rows and is
// reported in failedCategories instead of silently emptying the catalog
export function mergeCategoryResults(results = []) {
  const seen = new Set();
  const products = [];
  const failedCategories = [];
  let stale = false;
  let staleFrom = null;
  for (const r of results) {
    if (!r.ok) {
      failedCategories.push({ id: r.id ?? null, error: r.error || "unknown error" });
      for (const p of r.fallback || []) {
        if (!p.productId || seen.has(p.productId)) continue;
        seen.add(p.productId);
        products.push(p);
      }
      continue;
    }
    for (const p of r.items || []) {
      if (!p.productId || seen.has(p.productId)) continue;
      seen.add(p.productId);
      products.push(p);
    }
    if (r.stale) {
      stale = true;
      staleFrom = r.staleFrom || staleFrom;
    }
  }
  return { products, failedCategories, stale, staleFrom };
}

// load the real catalog into GW.gadgets. resolves {ok,count,cached,stale,
// fetchedAt,failedCategories}; throws when upstream returns nothing at all
export async function loadCatalog() {
  GW.gadgets = []; // fixture must not linger in the live data path
  GW.catalogStale = false;
  GW.catalogStaleFrom = null;

  // Admin categories shape the category list itself, so this must run on every
  // load: a fresh client cache used to skip it entirely and self-added
  // categories stayed invisible for up to the whole cache lifetime.
  const { list, queries } = await categoryPlan();
  // the plan hash is part of the cache key, so a category edit
  // (rename / new query / new category) invalidates the product cache.
  const CACHE_KEY = CACHE_PREFIX + planHash(list);

  // Per-category cache: { fetchedAt, stale, categories: { id: { fetchedAt,
  // rows, stale } } }. Each category carries its own timestamp, so a category
  // that failed is retried on the next load instead of being cached for 7 days.
  let cache = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") cache = parsed;
    }
  } catch {
    /* corrupt cache -> refetch */
  }
  const cachedCats = (cache && cache.categories) || {};

  const now = Date.now();
  const results = [];
  const nextCats = { ...cachedCats }; // failed categories keep their old entry
  const toFetch = [];

  for (const [cat, q] of queries) {
    const c = cachedCats[cat];
    if (c && Array.isArray(c.rows) && c.rows.length && now - c.fetchedAt < TTL) {
      // still fresh: no upstream call, no quota spent
      results.push({ id: cat, ok: true, items: c.rows, stale: Boolean(c.stale), fetchedAt: c.fetchedAt });
      continue;
    }
    toFetch.push([cat, q]);
  }

  if (toFetch.length) {
    const settled = await Promise.allSettled(toFetch.map(([cat, q]) => fetchCategory(cat, q)));
    for (let i = 0; i < settled.length; i++) {
      const [cat] = toFetch[i];
      const prev = cachedCats[cat];
      const r = settled[i];
      if (r.status !== "fulfilled") {
        results.push({ id: cat, ok: false, error: "fetch failed", fallback: prev?.rows || [], fetchedAt: prev?.fetchedAt || null });
        continue;
      }
      const { items, ok, error, stale, staleFrom } = r.value;
      if (!ok) {
        // keep the older rows for this category, report the failure,
        // and do NOT refresh its timestamp - it is retried on the next load.
        results.push({ id: cat, ok: false, error, fallback: prev?.rows || [], fetchedAt: prev?.fetchedAt || null });
        continue;
      }
      results.push({ id: cat, ok: true, items, stale, staleFrom, fetchedAt: now });
      nextCats[cat] = { fetchedAt: now, rows: items, stale: Boolean(stale), staleFrom: staleFrom || null };
    }
  }

  const merged = mergeCategoryResults(results);
  const failedCategories = merged.failedCategories;
  // stale = upstream served an old snapshot OR we are serving expired rows
  const servingExpired = results.some((r) => !r.ok && (r.fallback || []).length);
  const stale = Boolean(merged.stale || servingExpired);
  // "as of" is the OLDEST served row - the whole set is only as fresh as
  // its stalest member. A live fetch is now; a cached category is its own
  // timestamp.
  const stamps = results.map((r) => r.fetchedAt).filter((t) => typeof t === "number");
  const fetchedAt = stamps.length ? Math.min(...stamps) : null;
  // cached = nothing was fetched from the upstream in this load
  const cached = toFetch.length === 0;

  if (!merged.products.length) {
    // Live API exhausted or down and nothing cached: an honest failure, never
    // fabricated or blank rows.
    throw new Error("No products returned from the marketplace");
  }

  GW.gadgets = merged.products.map(toCatalogGadget);
  if (stale) {
    GW.catalogStale = true;
    GW.catalogStaleFrom = merged.staleFrom || null;
  }
  // the freshness of the served data (and the stale flag) is persisted
  // and returned so the UI can say when this was last updated.
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt, stale, categories: nextCats }),
    );
  } catch {
    /* quota: still usable for this session */
  }
  return {
    ok: true,
    count: GW.gadgets.length,
    cached,
    stale,
    fetchedAt,
    failedCategories,
  };
}


/* GadgetWise-curated products (admin-managed `products` table) merged into the
   catalog alongside marketplace listings. Mapped to the same gadget shape. */
export function curatedRowsForPublic(rows = []) {
  const seen = new Set();
  return rows.filter((p) => {
    // Quarantine obvious propagation-test/placeholder records without deleting
    // the admin record. Public discovery must not present test data as a real
    // product. Empty model, non-positive price, and test-like names are not
    // publishable catalog records.
    const model = String(p.model || "").trim();
    const testSentinel = /^ZZ\b|propagated|test product|placeholder/i.test(model);
    if (testSentinel || !model || p.price == null || Number(p.price) <= 0) return false;
    const key = [p.brand || "", p.model || "", p.category || "", p.price ?? "", p.image || "", p.description || ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(model);
  });
}

export async function loadCurated() {
  try {
    const r = await loadProducts();
    if (!r.ok || !r.rows?.length) return { ok: !!r.ok, count: 0 };
    const extra = curatedRowsForPublic(r.rows).map((p) => ({
      id: `gw-${p.id}`,
      brand: p.brand || "Unknown",
      model: p.model,
      category: p.category || "smartphones",
      price: p.price ?? 0,
      rating: 0,
      reviewCount: 0,
      originalPrice: p.original_price ?? null,
      image: p.image || "",
      sellerName: "GadgetWise",
      productUrl: null,
      marketplace: false,
      tagline: "",
      summary: p.description || "GadgetWise-curated product.",
      specs: {},
      specList: [],
      scored: { performance: null, battery: null, durability: null, portability: null, display: null, camera: null, storage: null, repairability: null },
      battery: null,
      value: { warrantyYears: null, lifespanYears: null, repairabilityLabel: "Not specified" },
      strengths: [], weaknesses: [], goodFor: [], notIdeal: [], reviews: [], issues: [], durab: null, repair: null,
    }));
    // prepend curated so they surface first; keep marketplace after
    GW.gadgets = [...extra, ...GW.gadgets.filter((g) => !String(g.id).startsWith("gw-"))];
    return { ok: true, count: extra.length };
  } catch {
    return { ok: false, count: 0 };
  }
}
