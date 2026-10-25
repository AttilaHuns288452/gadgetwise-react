/**
 * Real Lazada listings mapped into the app's gadget shape so clicking a live
 * product opens OUR detail page (/#/g/:id) instead of jumping to Lazada.
 *
 * Real fields (image, name, brand, price, rating, reviewCount, source link)
 * come straight from the marketplace. Everything the catalog engine needs but
 * the marketplace does not send (battery hours, warranty, curated sub-scores) is
 * set to an explicit neutral value and flagged `marketplace: true`, so the UI
 * can label it a live listing and never pass neutral values off as curated
 * GadgetWise ratings. Cost-per-month and the Performance-to-Cost index are the
 * existing deterministic formulas over these values — nothing is invented to
 * make a listing look better.
 */

import GW from "../data.js";

const REGISTRY = new Map();

// Wire the id resolver at module init so GW.getGadget finds live listings.
GW.listingResolver = (id) => REGISTRY.get(id) || null;

/** Category keyword -> catalog category id. ponytail: title heuristics; a
 *  mis-bucketed listing just lands in the wrong tab, never crashes. */
function inferCategory(title = "") {
  const t = title.toLowerCase();
  if (/(laptop|macbook|notebook|chromebook|ultrabook)/.test(t)) return "laptops";
  if (/(tablet|ipad|galaxy tab|pad \d|xiaomi pad)/.test(t)) return "tablets";
  if (/(earbud|headphone|earphone|airpod|headset|tws)/.test(t)) return "headphones";
  if (/(power bank|powerbank|powercore|charger|battery pack)/.test(t)) return "powerbanks";
  if (/(smart ?watch|watch|fitness band|mi band|galaxy watch)/.test(t)) return "smartwatches";
  return "smartphones";
}

/** Split a listing title into brand + model without inventing either. */
function splitBrandModel(p) {
  const brand = p.brandName && p.brandName !== "No Brand" ? p.brandName : "";
  let model = p.title || "Unnamed listing";
  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
    model = model.slice(brand.length).trim();
  }
  if (!model) model = p.title || "Unnamed listing";
  return { brand: brand || "Unknown", model };
}

/**
 * Map one normalized Lazada product into the gadget shape. Returns a complete
 * object so GadgetDetail never dereferences undefined.
 */
export function toGadget(p) {
  const id = `lazada-${p.productId}`;
  const { brand, model } = splitBrandModel(p);
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 0;
  const category = inferCategory(p.title);

  // Unknown for marketplace listings: the upstream sends no battery, warranty,
  // or curated sub-scores. Set them to null (unavailable) — never fabricated.
  // The scoring engine excludes null inputs and renormalizes (see lib.js).
  const g = {
    id,
    brand,
    model,
    category,
    // Unknown price stays null (unavailable), never 0: 0 reads as "free" and
    // would win every price filter/ranking. Price-dependent views must skip it.
    price: Number.isFinite(p.price) && p.price > 0 ? p.price : null,
    rating,
    reviewCount: p.reviewCount ?? 0,
    releaseYear: null, // unknown for marketplace listings
    status: "published",
    marketplace: true,
    productUrl: p.productUrl || null,
    sellerName: p.sellerName || null,
    currency: p.currency || "PHP",
    originalPrice: p.originalPrice != null ? p.originalPrice : null,
    tagline: p.title || "Live marketplace listing",
    summary: p.sellerName
      ? `Sold on Lazada by ${p.sellerName}. Real-time listing data; GadgetWise catalog ratings are not curated for marketplace items.`
      : "Real-time Lazada listing. GadgetWise catalog ratings are not curated for marketplace items.",
    image: p.imageUrl || "",
    specs: p.brandName ? { Brand: p.brandName } : {},
    specList: p.brandName ? [`Brand: ${p.brandName}`] : [],
    scored: {
      performance: null,
      battery: null,
      durability: null,
      portability: null,
      display: null,
      camera: null,
      storage: null,
      repairability: null,
    },
    battery: null, // unknown — excluded from scoring, never fabricated
    value: {
      warrantyYears: null, // unknown for marketplace listings
      lifespanYears: null,
      repairabilityLabel: "Not specified for marketplace listings",
    },
    strengths: [],
    weaknesses: [],
    goodFor: [],
    notIdeal: [],
    reviews: [],
    issues: [],
    durab: null,
    repair: null,
  };
  REGISTRY.set(id, g);
  return g;
}

/** Map + register a batch. Returns the mapped gadgets. */
export function registerListings(products = []) {
  return products.map(toGadget);
}

/**
 * A price we actually know. Unknown marketplace prices stay null (unavailable)
 * and must be excluded from price filters, sorts and rankings — 0 would read as
 * "free" and win every comparison.
 */
export function knownPrice(g) {
  const p = g?.price;
  return typeof p === "number" && Number.isFinite(p) && p > 0 ? p : null;
}

/** Look up a registered marketplace gadget by id (e.g. "lazada-15458423476"). */
export function getListing(id) {
  return REGISTRY.get(id) || null;
}

/** Is this a marketplace id? */
export function isListingId(id) {
  return typeof id === "string" && id.startsWith("lazada-");
}

/**
 * Fetch-on-miss: load a marketplace listing by id from the API and register it.
 * The registry is in-memory, so a deep-link or refresh would otherwise 404.
 *
 * Returns a structured state, never a bare null: the caller must be able to
 * tell "this listing is gone" from "the lookup failed".
 *   { status: "found", gadget } | { status: "not-found" } | { status: "error", error }
 */
export async function fetchListing(id) {
  if (!isListingId(id)) return { status: "not-found", gadget: null, error: null };
  const existing = REGISTRY.get(id);
  if (existing) return { status: "found", gadget: existing, error: null };
  const productId = id.slice("lazada-".length);
  let r, d;
  try {
    r = await fetch(`/api/lazada/product?id=${encodeURIComponent(productId)}&marketplace=ph`);
    d = await r.json();
  } catch {
    return { status: "error", gadget: null, error: "Could not reach the marketplace. Please try again." };
  }
  // 404 is a real absence; every other failure is a failure the user can retry.
  if (!r.ok) {
    if (r.status === 404) return { status: "not-found", gadget: null, error: null };
    return {
      status: "error",
      gadget: null,
      error: d?.error?.message || "The marketplace lookup failed. Please try again.",
    };
  }
  const p = d?.product;
  if (!p) return { status: "not-found", gadget: null, error: null };
  return { status: "found", gadget: toGadget(p), error: null };
}

/**
 * Fetch one page of live marketplace results. A failure is an ERROR, never an
 * empty product list: an exception used to become {products: []} and
 * then read as "no live listings found".
 * Returns { ok, aborted, products, next, error:{code,message}|null }.
 */
export async function searchMarketplacePage({ q, page = 1, startKey = "", signal, fetchImpl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const qs = new URLSearchParams({ q, marketplace: "ph", page: String(page) });
  if (startKey) qs.set("start_key", startKey);
  let r, d;
  try {
    r = await doFetch(`/api/lazada/search?${qs}`, signal ? { signal } : undefined);
    d = await r.json();
  } catch (err) {
    // an aborted request is a cancellation, not a failure
    if (err?.name === "AbortError") return { ok: false, aborted: true, products: [], next: "", error: null };
    return {
      ok: false,
      aborted: false,
      products: [],
      next: "",
      error: { code: "network_error", message: "Could not reach the marketplace. Please try again." },
    };
  }
  if (!r.ok) {
    const code = d?.error?.code || "search_failed";
    return {
      ok: false,
      aborted: false,
      products: [],
      next: "",
      error: {
        code,
        message:
          code === "rate_limited"
            ? "Marketplace is busy right now (rate limit). Please try again in a minute."
            : d?.error?.message || "Product search is temporarily unavailable. Please try again.",
      },
    };
  }
  return { ok: true, aborted: false, products: d?.products || [], next: d?.next || "", error: null };
}

/**
 * Merge page results: dedupe by productId, keep the first error, and never
 * turn a failed page into "no results".
 */
export function mergeSearchPages(pages = []) {
  const seen = new Set();
  const items = [];
  let error = null;
  for (const p of pages) {
    if (!p) continue;
    if (p.error) {
      if (!error) error = p.error;
      continue;
    }
    for (const item of p.products || []) {
      if (item?.productId && !seen.has(item.productId)) {
        seen.add(item.productId);
        items.push(item);
      }
    }
  }
  return { items, error };
}
