/**
 * Real catalog loader. The single seam every product page reads: it fills
 * `GW.gadgets` with REAL Lazada listings (via /api/lazada/search + toGadget),
 * so Catalog, Home, Compare, Quiz, Wishlist, Profile all show live products
 * without rewriting each page. The fictional fixture lives in data.js and is
 * used ONLY by tests (check.js / marketplace.test.js never import this file).
 *
 * Missing-data honesty: toGadget maps unknown specs to null and the scoring
 * engine (lib.js) excludes them + renormalizes — so a real product is never
 * scored on invented battery/warranty/sub-scores.
 */

import GW from "../data.js";
import { toGadget } from "./marketplace.js";
import { loadProducts, loadCategories } from "./store.js";

// Bump after catalog-data integrity changes so an old browser never revives
// stale or placeholder-heavy marketplace results.
const CACHE_KEY = "gw.catalog.v3";
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

/**
 * Category source of truth. The admin-managed `categories` table overrides the
 * built-in defaults by slug: renaming changes the public label, editing the
 * query changes what the marketplace fetch fills the category with, and a new
 * slug + query adds a category with products. Rows merge over the defaults so
 * one admin edit never deletes the rest of the catalog.
 */
async function categoryPlan() {
  const base = CATEGORY_QUERIES.map(([id, query]) => ({
    id,
    name: GW.getCategory(id)?.name || id,
    query,
  }));
  try {
    const rows = (await loadCategories()).rows || [];
    const byId = new Map(base.map((c) => [c.id, c]));
    for (const r of rows) {
      const slug = String(r.slug || "").trim();
      if (!slug) continue;
      const query = String(r.query || "").trim();
      const existing = byId.get(slug);
      if (existing) {
        if (r.name) existing.name = r.name;
        if (query) existing.query = query;
      } else if (query && r.name) {
        byId.set(slug, { id: slug, name: r.name, query });
      }
    }
    const list = [...byId.values()];
    // every page reads GW.categories (Home tiles, filters, quiz cases), so the
    // admin list has to land there to actually influence the public site
    GW.categories = list.map((c) => ({ id: c.id, name: c.name }));
    return list.filter((c) => c.query).map((c) => [c.id, c.query]);
  } catch {
    return CATEGORY_QUERIES;
  }
}

async function fetchCategory(catId, query) {
  const out = { items: [], stale: false, staleFrom: null };
  for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
    const qs = new URLSearchParams({ q: query, marketplace: "ph", page: String(page) });
    let r;
    try {
      r = await fetch(`/api/lazada/search?${qs}`);
    } catch {
      continue; // network blip on one page: keep the rest
    }
    if (!r.ok) continue; // e.g. 429 on one page: keep the rest
    const d = await r.json();
    for (const p of d.products || []) out.items.push({ ...p, _cat: catId });
    // the handler serves a real snapshot when the provider is unavailable and
    // marks it stale — surface that so cached rows are never sold as live
    if (d.stale) { out.stale = true; out.staleFrom = d.staleFrom || out.staleFrom; }
  }
  return out;
}

function toCatalogGadget(p) {
  const g = toGadget(p);
  g.category = p._cat; // bucket by the category we searched, not title guess
  return g;
}

/**
 * Real catalog statistics derived from the live product list. Every number is
 * counted from actual loaded listings — nothing is invented. Used by the admin
 * console in place of the old fabricated analytics.
 */
export function catalogStats(gadgets = GW.gadgets) {
  const byCat = {};
  let priceSum = 0;
  let withRating = 0;
  let ratingSum = 0;
  for (const g of gadgets) {
    byCat[g.category] = (byCat[g.category] || 0) + 1;
    priceSum += g.price || 0;
    if (g.rating > 0) {
      withRating += 1;
      ratingSum += g.rating;
    }
  }
  return {
    total: gadgets.length,
    categories: Object.entries(byCat)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    avgPrice: gadgets.length ? Math.round(priceSum / gadgets.length) : 0,
    withRating,
    avgRating: withRating ? Math.round((ratingSum / withRating) * 10) / 10 : 0,
  };
}

/**
 * Load the real catalog into GW.gadgets. Clears the fixture first so it never
 * sits in the production data path. Resolves { ok, count, cached } on success;
 * throws when the upstream returns nothing at all (caller shows an honest error,
 * never the fictional fixture).
 */
export async function loadCatalog() {
  GW.gadgets = []; // fixture must not linger in the live data path

  let stale = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { fetchedAt, products } = JSON.parse(raw);
      if (Array.isArray(products) && products.length) {
        if (Date.now() - fetchedAt < TTL) {
          GW.gadgets = products.map(toCatalogGadget);
          return { ok: true, count: GW.gadgets.length, cached: true };
        }
        stale = products; // keep as a fallback if the refetch comes back empty
      }
    }
  } catch {
    /* corrupt cache -> refetch */
  }

  let products = [];
  const queries = await categoryPlan(); // admin categories shape the fetch
  try {
    const settled = await Promise.allSettled(
      queries.map(([cat, q]) => fetchCategory(cat, q)),
    );
    const seen = new Set();
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const p of r.value.items) {
        if (!p.productId || seen.has(p.productId)) continue;
        seen.add(p.productId);
        products.push(p);
      }
      if (r.value.stale) { GW.catalogStale = true; GW.catalogStaleFrom = r.value.staleFrom || GW.catalogStaleFrom; }
    }
  } catch {
    /* network/upstream failure: fall through to the stale cache */
  }

  if (!products.length) {
    // Live API exhausted or down: serve the last good catalog instead of an
    // empty page. Stale-but-real beats fabricated or blank.
    if (stale && stale.length) {
      GW.gadgets = stale.map(toCatalogGadget);
      return { ok: true, count: GW.gadgets.length, cached: true, stale: true };
    }
    throw new Error("No products returned from the marketplace");
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), products }));
  } catch {
    /* quota: still usable for this session */
  }
  GW.gadgets = products.map(toCatalogGadget);
  return { ok: true, count: GW.gadgets.length, cached: false };
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
      tagline: p.description || p.model,
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
