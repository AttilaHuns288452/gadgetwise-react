/**
 * Tests for lib/lazada.js pure logic. Run: node --test test/
 * Covers validation, price/rating parsing, normalization, and error mapping.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuery,
  normalizeMarketplace,
  normalizePage,
  isValidProductId,
  toPrice,
  toRating,
  toCount,
  normalizeProduct,
  isRealProduct,
  isErrorBody,
  normalizeSearchResponse,
  mapUpstreamError,
  buildSearchUrl,
} from "../lib/lazada.js";

test("normalizeQuery bounds length and trims", () => {
  assert.equal(normalizeQuery("  laptop  "), "laptop");
  assert.equal(normalizeQuery("a"), null, "too short");
  assert.equal(normalizeQuery("x".repeat(121)), null, "too long");
  assert.equal(normalizeQuery(42), null, "non-string");
});

test("normalizeMarketplace accepts 6 codes, rejects others", () => {
  assert.equal(normalizeMarketplace("ph"), "ph");
  assert.equal(normalizeMarketplace("PH"), "ph");
  assert.equal(normalizeMarketplace("us"), null);
  assert.equal(normalizeMarketplace(""), "ph", "defaults to ph");
  assert.equal(normalizeMarketplace(undefined), "ph");
});

test("normalizePage bounds pagination", () => {
  assert.equal(normalizePage(undefined), 1);
  assert.equal(normalizePage("0"), 1);
  assert.equal(normalizePage("-3"), 1);
  assert.equal(normalizePage("3"), 3);
  assert.equal(normalizePage("999"), 50, "capped");
  assert.equal(normalizePage("junk"), 1);
});

test("isValidProductId requires numeric id", () => {
  assert.equal(isValidProductId("4999580322"), true);
  assert.equal(isValidProductId("42"), false, "too short");
  assert.equal(isValidProductId("abc"), false);
  assert.equal(isValidProductId(""), false);
});

test("toPrice drops NaN, zero, negatives", () => {
  assert.equal(toPrice(7299), 7299);
  assert.equal(toPrice("123.5"), 123.5);
  assert.equal(toPrice(0), null);
  assert.equal(toPrice(-5), null);
  assert.equal(toPrice("abc"), null);
  assert.equal(toPrice(undefined), null);
});

test("toRating clamps to 0..5 and rejects invalid", () => {
  assert.equal(toRating(5), 5);
  assert.equal(toRating(4.5), 4.5);
  assert.equal(toRating(6), null);
  assert.equal(toRating(-1), null);
  assert.equal(toRating("x"), null);
});

test("toCount floors and defaults to 0", () => {
  assert.equal(toCount(7), 7);
  assert.equal(toCount("12"), 12);
  assert.equal(toCount(-3), 0);
  assert.equal(toCount("junk"), 0);
});

test("normalizeProduct never fabricates missing fields", () => {
  const n = normalizeProduct({ product_id: "12345", title: "  Test  " });
  assert.equal(n.productId, "12345");
  assert.equal(n.title, "Test", "trimmed");
  assert.equal(n.price, null, "missing price stays null, not 0");
  assert.equal(n.rating, null);
  assert.equal(n.reviewCount, 0);
  assert.equal(n.inStock, false);
  assert.equal(n.source, "lazada");
  assert.equal(n.brandName, null);
});

test("normalizeProduct maps full upstream shape", () => {
  const n = normalizeProduct({
    product_id: "4999580322",
    title: "Raspberry Pi 5",
    product_url: "https://www.lazada.com.ph/products/-i4999580322.html",
    brand_name: "Raspberry Pi",
    pricing: { currency: "PHP", current: 7299, original: 18249, discount_text: "60% Off" },
    reviews: { average_rating: 5.0, review_count: 7 },
    seller: { shop_name: "FU-LABS", seller_id: "501146720544" },
    sold_count: 19,
    in_stock: true,
    is_sponsored: false,
  });
  assert.equal(n.price, 7299);
  assert.equal(n.originalPrice, 18249);
  assert.equal(n.currency, "PHP");
  assert.equal(n.rating, 5);
  assert.equal(n.reviewCount, 7);
  assert.equal(n.sellerName, "FU-LABS");
  assert.equal(n.inStock, true);
});

test("normalizeSearchResponse handles empty and bad shapes", () => {
  assert.deepEqual(normalizeSearchResponse({}).products, []);
  assert.equal(normalizeSearchResponse({}).perPage, 40);
  const full = normalizeSearchResponse({
    count: 3572, per_page: 40, current_page: 1, total_pages: 90,
    next: "https://x?page=2", previous: null,
    products: [{ product_id: "1" }],
  });
  assert.equal(full.count, 3572);
  assert.equal(full.totalPages, 90);
  assert.equal(full.products.length, 1);
  assert.equal(full.previous, null);
});

test("mapUpstreamError branches on code not message", () => {
  const quota = mapUpstreamError(429, { code: "quota_exceeded", renews_at: "2026-11-05" });
  assert.equal(quota.status, 429);
  assert.equal(quota.code, "quota_exceeded");
  assert.equal(quota.renewsAt, "2026-11-05");

  const noKey = mapUpstreamError(401, { code: "missing_api_key" });
  assert.equal(noKey.code, "search_unconfigured");

  const badKey = mapUpstreamError(401, { code: "invalid_api_key" });
  assert.equal(badKey.code, "search_unconfigured");

  const rate = mapUpstreamError(429, { code: "rate_limited" }, { "retry-after": "60" });
  assert.equal(rate.retryAfter, "60");

  const serverErr = mapUpstreamError(502, { code: "upstream_unavailable" });
  assert.equal(serverErr.status, 502);

  const sub = mapUpstreamError(402, { code: "subscription_expired" });
  assert.equal(sub.status, 502, "never leaks 402 plan detail to client");
});

test("mapUpstreamError never leaks secrets or upstream text", () => {
  const r = mapUpstreamError(401, { code: "invalid_api_key", message: "The key sk-secret123 is wrong" });
  assert.equal(JSON.stringify(r).includes("sk-secret123"), false);
});

test("buildSearchUrl encodes params", () => {
  const u = new URL(buildSearchUrl({ query: "gaming laptop", marketplace: "ph", page: 2 }));
  assert.equal(u.searchParams.get("search_query"), "gaming laptop");
  assert.equal(u.searchParams.get("marketplace"), "ph");
  assert.equal(u.searchParams.get("page"), "2");
});

test("isRealProduct rejects all-null products", () => {
  assert.equal(isRealProduct(normalizeProduct({})), false, "empty raw is not a real product");
  assert.equal(isRealProduct(normalizeProduct(null)), false);
  assert.equal(isRealProduct(normalizeProduct({ product_id: "12345" })), true, "id is enough");
  assert.equal(isRealProduct(normalizeProduct({ title: "X" })), true, "title is enough");
});

test("isErrorBody detects 2xx error-shaped payloads", () => {
  assert.equal(isErrorBody({ code: "invalid_api_key", message: "bad key" }), true);
  assert.equal(isErrorBody({ code: "not_found", error: "nope" }), true);
  assert.equal(isErrorBody({ products: [], count: 0 }), false, "legit empty search is not an error");
  assert.equal(isErrorBody({ product_id: "1", title: "x" }), false);
  assert.equal(isErrorBody(null), false);
});

test("isErrorBody catches the generic upstream {message} shape (regression)", () => {
  // OmkarCloud returns 500/200 with just { message: 'Server Error' } and no code.
  assert.equal(isErrorBody({ message: "Server Error" }), true, "message-only with no data = error");
  assert.equal(isErrorBody({ message: "ok", products: [] }), false, "message + data keys = not error");
});

test("all-null product must not be treated as success (regression)", () => {
  // This is the exact bug: upstream 2xx with an unrecognizable body.
  const fake = normalizeProduct({});
  assert.equal(isRealProduct(fake), false);
  // and an error-shaped 2xx is caught too
  assert.equal(isErrorBody({ code: "upstream_unavailable", message: "down" }), true);
});
