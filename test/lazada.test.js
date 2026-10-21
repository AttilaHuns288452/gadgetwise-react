/**
 * Tests for lib/lazada.js (TMAPI contract). Run: node --test test/
 * Covers validation, price/rating parsing, normalization, envelope unwrapping,
 * and safe error mapping.
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
  unwrap,
  isErrorBody,
  normalizeSearchResponse,
  mapUpstreamError,
  buildSearchUrl,
  buildProductUrl,
  buildAuthHeaders,
  fetchUpstream,
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
  assert.equal(normalizePage("3"), 3);
  assert.equal(normalizePage("999"), 50, "capped");
  assert.equal(normalizePage("junk"), 1);
});

test("isValidProductId requires numeric id", () => {
  assert.equal(isValidProductId("4864957710"), true);
  assert.equal(isValidProductId("42"), false, "too short");
  assert.equal(isValidProductId("abc"), false);
  assert.equal(isValidProductId(""), false);
});

test("toPrice drops NaN, zero, negatives, handles comma strings", () => {
  assert.equal(toPrice(7299), 7299);
  assert.equal(toPrice("1423"), 1423);
  assert.equal(toPrice("1,423"), 1423, "strips commas");
  assert.equal(toPrice(0), null);
  assert.equal(toPrice(-5), null);
  assert.equal(toPrice("abc"), null);
  assert.equal(toPrice(undefined), null);
});

test("toRating clamps to 0..5 and rejects invalid", () => {
  assert.equal(toRating("4.0"), 4);
  assert.equal(toRating(5), 5);
  assert.equal(toRating(6), null);
  assert.equal(toRating("x"), null);
});

test("toCount floors and defaults to 0", () => {
  assert.equal(toCount("7"), 7);
  assert.equal(toCount(-3), 0);
  assert.equal(toCount("junk"), 0);
});

test("normalizeProduct maps the TMAPI search row", () => {
  const n = normalizeProduct({
    item_id: "4864957710",
    title: "  German Rausch hair water  ",
    product_url: "https://www.lazada.co.th/products/-i4864957710.html",
    img: "https://img/x.jpg",
    brand: "No Brand",
    currency: "THB",
    price: "1423",
    price_info: { sale_price: "1423", origin_price: "1637" },
    review_info: { average_score: "4.0", review_count: "1" },
    shop_info: { shop_name: "saixuan416541" },
    sold_count: null,
  });
  assert.equal(n.productId, "4864957710");
  assert.equal(n.title, "German Rausch hair water", "trimmed");
  assert.equal(n.price, 1423);
  assert.equal(n.originalPrice, 1637);
  assert.equal(n.currency, "THB");
  assert.equal(n.rating, 4);
  assert.equal(n.reviewCount, 1);
  assert.equal(n.sellerName, "saixuan416541");
  assert.equal(n.imageUrl, "https://img/x.jpg");
  assert.equal(n.soldCount, 0, "null -> 0");
});

test("normalizeProduct maps the TMAPI detail object (main_imgs)", () => {
  const n = normalizeProduct({
    item_id: 2457464623,
    title: "Electric toothbrush",
    brand: "P/S",
    currency: "VND",
    price_info: { sale_price: "460000", origin_price: "650000" },
    main_imgs: ["https://a.jpg", "https://b.jpg"],
    review_info: { average_score: "5", review_count: "10" },
    shop_info: { shop_name: "official" },
  });
  assert.equal(n.productId, "2457464623", "number id -> string");
  assert.equal(n.imageUrl, "https://a.jpg", "first main_img");
  assert.equal(n.price, 460000);
  assert.equal(n.rating, 5);
});

test("normalizeProduct never fabricates missing fields", () => {
  const n = normalizeProduct({ item_id: "12345", title: "  T  " });
  assert.equal(n.price, null, "missing price stays null, not 0");
  assert.equal(n.rating, null);
  assert.equal(n.reviewCount, 0);
  assert.equal(n.brandName, null);
  assert.equal(n.source, "lazada");
});

test("isRealProduct rejects all-null products", () => {
  assert.equal(isRealProduct(normalizeProduct({})), false);
  assert.equal(isRealProduct(normalizeProduct({ item_id: "12345" })), true);
  assert.equal(isRealProduct(normalizeProduct({ title: "X" })), true);
});

test("unwrap accepts the 200 envelope", () => {
  const u = unwrap({ code: 200, msg: "success", data: { items: [] } });
  assert.equal(u.ok, true);
});

test("unwrap rejects non-200 envelope codes", () => {
  const u = unwrap({ code: 500, msg: "Server Error" });
  assert.equal(u.ok, false);
  assert.equal(u.status, 500);
});

test("unwrap rejects the generic {message} body (RapidAPI shape)", () => {
  const u = unwrap({ message: "Server Error" });
  assert.equal(u.ok, false);
});

test("isErrorBody matches unwrap verdicts", () => {
  assert.equal(isErrorBody({ code: 200, data: { items: [] } }), false);
  assert.equal(isErrorBody({ code: 500, msg: "x" }), true);
  assert.equal(isErrorBody({ message: "Server Error" }), true);
  assert.equal(isErrorBody({ code: 200, msg: "ok", data: { items: [1] } }), false);
});

test("normalizeSearchResponse unwraps the TMAPI search envelope", () => {
  const r = normalizeSearchResponse({
    code: 200,
    msg: "success",
    data: {
      page: 1, page_size: 3, start_key: "1726385507727", total_count: 2993,
      items: [{ item_id: "1", title: "A" }],
    },
  });
  assert.equal(r.count, 2993);
  assert.equal(r.currentPage, 1);
  assert.equal(r.perPage, 3);
  assert.equal(r.products.length, 1);
  assert.equal(r.next, "1726385507727", "start_key cursor");
  assert.equal(r.totalPages, 50, "bounded estimate, capped");
});

test("normalizeSearchResponse handles empty and error shapes", () => {
  assert.deepEqual(normalizeSearchResponse({ code: 200, data: {} }).products, []);
  assert.deepEqual(normalizeSearchResponse({ message: "err" }).products, [], "error -> empty, not crash");
});

test("mapUpstreamError maps status codes safely", () => {
  assert.equal(mapUpstreamError(401, { msg: "bad key" }).code, "search_unconfigured");
  assert.equal(mapUpstreamError(429, {}, { "retry-after": "60" }).retryAfter, "60");
  assert.equal(mapUpstreamError(402, {}).code, "search_unavailable");
  assert.equal(mapUpstreamError(500, { msg: "Server Error" }).status, 502);
});

test("mapUpstreamError never leaks secrets or upstream text", () => {
  const r = mapUpstreamError(401, { msg: "The key sk-secret123 is wrong" });
  assert.equal(JSON.stringify(r).includes("sk-secret123"), false);
});

test("buildSearchUrl + buildProductUrl use the TMAPI paths and params", () => {
  const s = new URL(buildSearchUrl({ query: "gaming laptop", marketplace: "ph", page: 2, base: "https://api.tmapi.top/lazada" }));
  assert.equal(s.pathname, "/lazada/search/items");
  assert.equal(s.searchParams.get("site"), "ph");
  assert.equal(s.searchParams.get("keywords"), "gaming laptop");
  assert.equal(s.searchParams.get("page"), "2");

  const d = new URL(buildProductUrl({ productId: "4864957710", marketplace: "ph", base: "https://api.tmapi.top/lazada" }));
  assert.equal(d.pathname, "/lazada/item_detail");
  assert.equal(d.searchParams.get("item_id"), "4864957710");
});

test("buildAuthHeaders switches on gateway type", () => {
  const tmapi = buildAuthHeaders("tok", "https://api.tmapi.top/lazada");
  assert.equal(tmapi.apikey, "tok");
  assert.equal(tmapi["X-RapidAPI-Key"], undefined);

  const rapid = buildAuthHeaders("tok", "https://lazada-api.p.rapidapi.com/lazada");
  assert.equal(rapid["X-RapidAPI-Key"], "tok");
  assert.equal(rapid["X-RapidAPI-Host"], "lazada-api.p.rapidapi.com");
});

test("fetchUpstream retries once on transient 5xx then succeeds", async () => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? { status: 503 } : { status: 200, ok: true };
  };
  const r = await fetchUpstream("https://x", {}, { retries: 1 });
  globalThis.fetch = orig;
  assert.equal(r.status, 200);
  assert.equal(calls, 2, "retried once after 5xx");
});

test("fetchUpstream does NOT retry on 4xx", async () => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { status: 404 }; };
  const r = await fetchUpstream("https://x", {}, { retries: 1 });
  globalThis.fetch = orig;
  assert.equal(r.status, 404);
  assert.equal(calls, 1, "no retry on 4xx");
});
