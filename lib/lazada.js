/**
 * Lazada (OmkarCloud) adapter: pure logic, no I/O, fully unit-testable.
 * Contract reference: https://github.com/omkarcloud/lazada-scraper
 *
 * Search : GET https://lazada-scraper.omkar.cloud/lazada/catalog/search
 *          ?search_query=<q>&marketplace=<code>&page=<n>
 * Product: GET https://lazada-scraper.omkar.cloud/lazada/catalog/product
 *          ?product_id=<id>&marketplace=<code>
 * Auth   : header `API-Key: <secret>` (server-side only, never sent to browser)
 */

export const UPSTREAM = "https://lazada-scraper.omkar.cloud";
export const VALID_MARKETPLACES = ["ph", "my", "sg", "th", "vn", "id"];
export const DEFAULT_MARKETPLACE = "ph";

/** Lazada product IDs are numeric strings (e.g. "4999580322"). */
export function isValidProductId(id) {
  return typeof id === "string" && /^\d{3,20}$/.test(id.trim());
}

/** Search queries: bounded length, non-empty after trim. */
export function normalizeQuery(q) {
  if (typeof q !== "string") return null;
  const trimmed = q.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  return trimmed;
}

export function normalizeMarketplace(m) {
  const code = (m || DEFAULT_MARKETPLACE).toLowerCase().trim();
  return VALID_MARKETPLACES.includes(code) ? code : null;
}

export function normalizePage(p) {
  const n = Number.parseInt(p ?? "1", 10);
  // Bound pagination: never auto-walk every page, cap at 50.
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 50);
}

export function buildSearchUrl({ query, marketplace, page }) {
  const u = new URL(`${UPSTREAM}/lazada/catalog/search`);
  u.searchParams.set("search_query", query);
  u.searchParams.set("marketplace", marketplace);
  if (page > 1) u.searchParams.set("page", String(page));
  return u.toString();
}

export function buildProductUrl({ productId, marketplace }) {
  const u = new URL(`${UPSTREAM}/lazada/catalog/product`);
  u.searchParams.set("product_id", productId);
  u.searchParams.set("marketplace", marketplace);
  return u.toString();
}

/** Coerce any value to a finite, non-negative price or null (never NaN/0-as-real). */
export function toPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function toRating(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

/**
 * Normalize one raw upstream product into the app's stable shape.
 * Unknown/missing fields become null/empty, never fabricated values.
 */
export function normalizeProduct(raw) {
  const p = raw ?? {};
  const pricing = p.pricing ?? {};
  const reviews = p.reviews ?? {};
  const seller = p.seller ?? {};
  return {
    source: "lazada",
    productId: p.product_id != null ? String(p.product_id) : null,
    title: typeof p.title === "string" ? p.title.trim() : null,
    brandName: typeof p.brand_name === "string" ? p.brand_name.trim() : null,
    productUrl: typeof p.product_url === "string" ? p.product_url : null,
    imageUrl: typeof p.image_url === "string" ? p.image_url : (Array.isArray(p.images) ? p.images[0] ?? null : null),
    currency: typeof pricing.currency === "string" ? pricing.currency : null,
    price: toPrice(pricing.current),
    originalPrice: toPrice(pricing.original),
    discountText: typeof pricing.discount_text === "string" ? pricing.discount_text : null,
    rating: toRating(reviews.average_rating),
    reviewCount: toCount(reviews.review_count),
    sellerName: typeof seller.shop_name === "string" ? seller.shop_name : null,
    soldCount: toCount(p.sold_count),
    inStock: p.in_stock === true,
    isSponsored: p.is_sponsored === true,
  };
}

export function normalizeSearchResponse(json) {
  const d = json ?? {};
  return {
    count: toCount(d.count),
    perPage: toCount(d.per_page) || 40,
    currentPage: toCount(d.current_page) || 1,
    totalPages: toCount(d.total_pages),
    next: typeof d.next === "string" ? d.next : null,
    previous: typeof d.previous === "string" ? d.previous : null,
    products: Array.isArray(d.products) ? d.products.map(normalizeProduct) : [],
  };
}

/**
 * Map an upstream failure to a safe, stable client-facing error.
 * Branch on `code`, never on message (per OmkarCloud docs). We never leak
 * the API key, upstream internals, or stack traces.
 */
export function mapUpstreamError(status, body, headers = {}) {
  const code = body && typeof body.code === "string" ? body.code : null;
  const retryAfter = headers["retry-after"] ?? headers["Retry-After"] ?? null;

  if (code === "quota_exceeded") {
    return { status: 429, code: "quota_exceeded", message: "Search is temporarily unavailable (upstream quota reached). Please try again later.", renewsAt: body?.renews_at ?? null };
  }
  if (code === "rate_limited") {
    return { status: 429, code: "rate_limited", message: "Too many searches. Please slow down and try again shortly.", retryAfter };
  }
  if (code === "missing_api_key" || code === "invalid_api_key") {
    return { status: 502, code: "search_unconfigured", message: "Product search is not available right now.", hint: "Server-side API key is missing or invalid." };
  }
  if (status === 402 || (code && code.startsWith("subscription"))) {
    return { status: 502, code: "search_unavailable", message: "Product search is not available right now." };
  }
  if (status >= 500) {
    return { status: 502, code: "upstream_unavailable", message: "Product search is temporarily unavailable. Please try again.", retryAfter };
  }
  return { status: 502, code: "search_failed", message: "Product search failed. Please try again." };
}
