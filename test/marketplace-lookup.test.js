/**
 * Regression tests for the marketplace lookup / search integrity fixes.
 *
 *   GW-18: fetchListing collapsed timeout/quota/server errors to null, and the
 *          detail page then said "not found". It must return a structured
 *          state: found / not-found / error.
 *   GW-13: a fetch or JSON exception became {products: []} and rendered as
 *          "No live listings found". A failure must stay a failure.
 *   GW-11: every keystroke started a 6-page fetch loop with no AbortController
 *          and no cancellation recheck. The page fetch must be abortable and
 *          must report an abort as an abort, not as an error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchListing,
  searchMarketplacePage,
  mergeSearchPages,
} from "../src/lib/marketplace.js";

const realFetch = globalThis.fetch;

function stubFetch(fn) {
  globalThis.fetch = fn;
  return () => {
    globalThis.fetch = realFetch;
  };
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}


test("GW-18: a successful lookup returns the found state with the gadget", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ product: { productId: "555", title: "Found Phone", price: 100 } }),
  );
  const res = await fetchListing("lazada-555");
  restore();
  assert.equal(res.status, "found");
  assert.equal(res.gadget.id, "lazada-555");
  assert.equal(res.gadget.model, "Found Phone");
  assert.equal(res.error, null);
});

test("GW-18: a 404 is a real absence, not an error", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: { code: "product_not_found", message: "gone" } }, { ok: false, status: 404 }),
  );
  const res = await fetchListing("lazada-404");
  restore();
  assert.equal(res.status, "not-found");
  assert.equal(res.gadget, null);
  assert.equal(res.error, null, "an absent listing is not a failure to report");
});

test("GW-18: a server error is an error state, never 'not found'", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: { code: "upstream_unavailable", message: "Product lookup is temporarily unavailable." } },
      { ok: false, status: 502 }),
  );
  const res = await fetchListing("lazada-502");
  restore();
  assert.equal(res.status, "error", "a failed lookup must not read as an absent listing");
  assert.equal(res.gadget, null);
  assert.ok(res.error, "the error message is carried for the UI");
  assert.match(res.error, /temporarily unavailable/i);
});

test("GW-18: a quota/rate-limit error is an error state, never 'not found'", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: { code: "rate_limited", message: "Too many searches." } }, { ok: false, status: 429 }),
  );
  const res = await fetchListing("lazada-429");
  restore();
  assert.equal(res.status, "error");
  assert.match(res.error, /too many searches/i);
});

test("GW-18: a network exception is an error state, never 'not found'", async () => {
  const restore = stubFetch(async () => {
    throw new Error("network down");
  });
  const res = await fetchListing("lazada-net");
  restore();
  assert.equal(res.status, "error");
  assert.ok(res.error);
});

test("GW-18: a non-marketplace id is never fetched and never claims an error", async () => {
  let called = false;
  const restore = stubFetch(async () => {
    called = true;
    return jsonResponse({});
  });
  const res = await fetchListing("apple-macbook-air-m1");
  restore();
  assert.equal(called, false, "curated ids never hit the API");
  assert.equal(res.status, "not-found");
  assert.equal(res.error, null);
});


test("GW-13: a failed page fetch is an error, not an empty product list", async () => {
  const restore = stubFetch(async () => {
    throw new Error("network down");
  });
  const res = await searchMarketplacePage({ q: "laptop" });
  restore();
  assert.equal(res.ok, false);
  assert.equal(res.products.length, 0);
  assert.ok(res.error, "the failure is reported as an error");
  assert.equal(res.error.code, "network_error");
});

test("GW-13: a non-2xx response is an error, not an empty product list", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: { code: "upstream_unavailable", message: "Product search is temporarily unavailable. Please try again." } },
      { ok: false, status: 502 }),
  );
  const res = await searchMarketplacePage({ q: "laptop" });
  restore();
  assert.equal(res.ok, false);
  assert.equal(res.error.code, "upstream_unavailable");
  assert.match(res.error.message, /temporarily unavailable/i);
});

test("GW-13: a rate-limited response is reported as rate limiting", async () => {
  const restore = stubFetch(async () =>
    jsonResponse({ error: { code: "rate_limited", message: "Too many searches." } }, { ok: false, status: 429 }),
  );
  const res = await searchMarketplacePage({ q: "laptop" });
  restore();
  assert.equal(res.error.code, "rate_limited");
  assert.match(res.error.message, /rate limit/i);
});

test("GW-13: a JSON parse failure is an error, not an empty product list", async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    },
  }));
  const res = await searchMarketplacePage({ q: "laptop" });
  restore();
  assert.equal(res.ok, false);
  assert.ok(res.error);
});

test("GW-13: a genuinely empty successful page is NOT an error", async () => {
  const restore = stubFetch(async () => jsonResponse({ products: [], next: "" }));
  const res = await searchMarketplacePage({ q: "zzzz" });
  restore();
  assert.equal(res.ok, true);
  assert.equal(res.error, null);
  assert.equal(res.products.length, 0);
});


test("GW-11: an aborted request is a cancellation, not an error", async () => {
  const ctrl = new AbortController();
  const restore = stubFetch(async () => {
    ctrl.abort();
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  });
  const res = await searchMarketplacePage({ q: "laptop", signal: ctrl.signal });
  restore();
  assert.equal(res.aborted, true);
  assert.equal(res.ok, false);
  assert.equal(res.error, null, "a cancellation is not a failure to report to the user");
});

test("GW-11: the abort signal is passed to fetch so the request really cancels", async () => {
  let seen = null;
  const ctrl = new AbortController();
  const restore = stubFetch(async (url, opts) => {
    seen = opts?.signal;
    return jsonResponse({ products: [], next: "" });
  });
  await searchMarketplacePage({ q: "laptop", signal: ctrl.signal });
  restore();
  assert.equal(seen, ctrl.signal, "the controller's signal reaches fetch");
});

test("GW-11: the page cursor and start_key ride along for page 2", async () => {
  const urls = [];
  const restore = stubFetch(async (url) => {
    urls.push(url);
    return jsonResponse({ products: [], next: "CURSOR2" });
  });
  const res = await searchMarketplacePage({ q: "laptop", page: 2, startKey: "CURSOR1" });
  restore();
  assert.match(urls[0], /page=2/);
  assert.match(urls[0], /start_key=CURSOR1/);
  assert.equal(res.next, "CURSOR2", "the next cursor is returned for on-demand paging");
});


test("merged pages dedupe by productId and keep the first error", () => {
  const merged = mergeSearchPages([
    { ok: true, products: [{ productId: "1" }, { productId: "2" }] },
    { ok: false, products: [], error: { code: "network_error", message: "boom" } },
    { ok: true, products: [{ productId: "2" }, { productId: "3" }] },
  ]);
  assert.deepEqual(merged.items.map((i) => i.productId), ["1", "2", "3"]);
  assert.equal(merged.error.code, "network_error", "a failed page is never a silent empty page");
});
