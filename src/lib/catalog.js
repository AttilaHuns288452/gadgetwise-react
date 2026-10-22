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

const CACHE_KEY = "gw.catalog.v2";
const TTL = 30 * 60 * 1000; // 30 min
const PAGES_PER_CATEGORY = 2;

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

async function fetchCategory(catId, query) {
  const items = [];
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
    for (const p of d.products || []) items.push({ ...p, _cat: catId });
  }
  return items;
}

function toCatalogGadget(p) {
  const g = toGadget(p);
  g.category = p._cat; // bucket by the category we searched, not title guess
  return g;
}

/**
 * Load the real catalog into GW.gadgets. Clears the fixture first so it never
 * sits in the production data path. Resolves { ok, count, cached } on success;
 * throws when the upstream returns nothing at all (caller shows an honest error,
 * never the fictional fixture).
 */
export async function loadCatalog() {
  GW.gadgets = []; // fixture must not linger in the live data path

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { fetchedAt, products } = JSON.parse(raw);
      if (Array.isArray(products) && products.length && Date.now() - fetchedAt < TTL) {
        GW.gadgets = products.map(toCatalogGadget);
        return { ok: true, count: GW.gadgets.length, cached: true };
      }
    }
  } catch {
    /* corrupt cache -> refetch */
  }

  const settled = await Promise.allSettled(
    CATEGORY_QUERIES.map(([cat, q]) => fetchCategory(cat, q)),
  );
  const seen = new Set();
  const products = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const p of r.value) {
      if (!p.productId || seen.has(p.productId)) continue;
      seen.add(p.productId);
      products.push(p);
    }
  }
  if (!products.length) throw new Error("No products returned from the marketplace");

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), products }));
  } catch {
    /* quota: still usable for this session */
  }
  GW.gadgets = products.map(toCatalogGadget);
  return { ok: true, count: GW.gadgets.length, cached: false };
}
