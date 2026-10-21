/**
 * Lazada (TMAPI) adapter: pure logic, no I/O, fully unit-testable.
 *
 * Contract (confirmed from https://tmapi.top/docs/lazada/...):
 *   Search : GET {BASE}/search/items   ?site=<code>&keywords=<q>&page=<n>
 *   Detail : GET {BASE}/item_detail    ?item_id=<id>&site=<code>
 *   Auth   : header `apikey: <token>` (TMAPI direct) OR
 *            headers `X-RapidAPI-Key` + `X-RapidAPI-Host` (RapidAPI gateway)
 *
 * The API key is server-side only (env), never sent to the browser.
 *
 * Response envelope (both endpoints):
 *   { code: 200, msg: "success", data: { ... } }
 *   `code` != 200 -> error. `data.items[]` (search) / `data` (detail).
 */

export const DEFAULT_BASE = "https://lazada-api.p.rapidapi.com/lazada";
export const VALID_MARKETPLACES = ["ph", "my", "sg", "th", "vn", "id"];
export const DEFAULT_MARKETPLACE = "ph";

/** Lazada item ids are numeric strings (e.g. "4864957710"). */
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
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 50); // bounded pagination, never auto-walk every page
}

/** The Lazada upstream is fixed. No env knob: the /lazada path prefix matters. */
export function getBase() {
  return DEFAULT_BASE;
}

/** Build auth headers for whichever gateway the base points at. */
export function buildAuthHeaders(key, base) {
  const b = base || getBase();
  if (/rapidapi/i.test(b)) {
    const host = new URL(b).host; // X-RapidAPI-Host must be bare hostname
    return { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host, Accept: "application/json" };
  }
  return { apikey: key, Accept: "application/json" };
}

/**
 * Fetch upstream with one retry on transient failures (417 "Get item detail
 * error" / 5xx / network). The endpoint throttles under burst and the same
 * request succeeds on a spaced retry. ponytail: single retry, no backoff loop.
 */
export async function fetchUpstream(url, headers, { retries = 1, timeoutMs = 20000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if ((r.status === 417 || r.status >= 500) && attempt < retries) {
        await new Promise((res) => setTimeout(res, 700));
        continue;
      }
      return r;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 700));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export function buildSearchUrl({ query, marketplace, page, base }) {
  const u = new URL(`${base || getBase()}/search/items`);
  u.searchParams.set("site", marketplace);
  u.searchParams.set("keywords", query);
  if (page > 1) u.searchParams.set("page", String(page));
  return u.toString();
}

export function buildProductUrl({ productId, marketplace, base }) {
  const u = new URL(`${base || getBase()}/item_detail`);
  u.searchParams.set("item_id", productId);
  u.searchParams.set("site", marketplace);
  return u.toString();
}

/** Coerce to a finite, non-negative price or null (never NaN / 0-as-real). */
export function toPrice(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/,/g, "").trim());
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

const asStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Normalize one raw TMAPI product into the app's stable shape. Works for both
 * the search `items[]` row and the detail `data` object. Unknown/missing fields
 * become null/0, never fabricated values.
 */
export function normalizeProduct(raw) {
  const p = raw ?? {};
  const priceInfo = p.price_info ?? {};
  const review = p.review_info ?? {};
  const shop = p.shop_info ?? {};
  const imgs = Array.isArray(p.main_imgs) ? p.main_imgs : null;
  return {
    source: "lazada",
    productId: p.item_id != null ? String(p.item_id) : null,
    title: asStr(p.title),
    brandName: asStr(p.brand),
    productUrl: asStr(p.product_url),
    imageUrl: asStr(p.img) ?? (imgs && imgs.length ? imgs[0] : null),
    currency: asStr(p.currency),
    price: toPrice(priceInfo.sale_price ?? p.price),
    originalPrice: toPrice(priceInfo.origin_price),
    discountText: asStr(p.discount),
    rating: toRating(review.average_score),
    reviewCount: toCount(review.review_count ?? p.comment_count),
    sellerName: asStr(shop.shop_name) ?? asStr(shop.seller_name),
    soldCount: toCount(p.sold_count),
    inStock: true, // search has no stock flag; never fabricate a false
    isSponsored: false,
  };
}

/** A normalized product is "real" only if it has an id or a title. */
export function isRealProduct(p) {
  return Boolean(p && (p.productId || p.title));
}

/**
 * Unwrap the {code,msg,data} envelope. Returns {ok, data} or {ok:false, ...}.
 * RapidAPI error bodies ({message}) are detected as errors so a 2xx error-shaped
 * payload never becomes a fake empty result.
 */
export function unwrap(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "bad_response", message: "Unexpected response from product data provider." };
  }
  if (typeof body.code === "number" && body.code !== 200) {
    return { ok: false, code: "upstream_error", status: body.code, message: asStr(body.msg) };
  }
  if (typeof body.message === "string" && !("data" in body) && !("items" in body)) {
    return { ok: false, code: "upstream_error", message: body.message };
  }
  return { ok: true, data: body.data ?? body };
}

/** isErrorBody: error-shaped iff unwrap() rejects it. */
export function isErrorBody(body) {
  return !unwrap(body).ok;
}

export function normalizeSearchResponse(json) {
  const u = unwrap(json);
  const d = u.ok ? u.data : {};
  const items = Array.isArray(d.items) ? d.items : [];
  const per = toCount(d.page_size) || items.length || 40;
  return {
    count: toCount(d.total_count),
    perPage: per,
    currentPage: toCount(d.page) || 1,
    // TMAPI paginates by start_key, not total_pages; bounded estimate.
    totalPages: toCount(d.total_count) && per ? Math.min(50, Math.ceil(toCount(d.total_count) / per)) : 0,
    next: asStr(d.start_key), // opaque cursor, not a URL
    previous: null,
    products: items.map(normalizeProduct),
  };
}

/**
 * Map an HTTP-level failure to a safe, stable client-facing error. Never leaks
 * the API key, upstream internals, or stack traces.
 */
export function mapUpstreamError(status, body, headers = {}) {
  const retryAfter = headers["retry-after"] ?? headers["Retry-After"] ?? null;
  const msg = body && typeof body.msg === "string" ? body.msg : null;

  if (status === 401 || /api.?key|unauthor/i.test(msg || "")) {
    return { status: 502, code: "search_unconfigured", message: "Product search is not available right now." };
  }
  if (status === 429) {
    return { status: 429, code: "rate_limited", message: "Too many searches. Please slow down and try again shortly.", retryAfter };
  }
  if (status === 402) {
    return { status: 502, code: "search_unavailable", message: "Product search is not available right now." };
  }
  if (status >= 500) {
    return { status: 502, code: "upstream_unavailable", message: "Product search is temporarily unavailable. Please try again.", retryAfter };
  }
  return { status: 502, code: "search_failed", message: "Product search failed. Please try again." };
}
