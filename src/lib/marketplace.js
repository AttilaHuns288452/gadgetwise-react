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
    price: p.price != null ? p.price : 0,
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

/** Look up a registered marketplace gadget by id (e.g. "lazada-15458423476"). */
export function getListing(id) {
  return REGISTRY.get(id) || null;
}

/** Is this a marketplace id? */
export function isListingId(id) {
  return typeof id === "string" && id.startsWith("lazada-");
}
