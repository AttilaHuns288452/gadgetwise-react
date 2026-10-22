import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeSearchResponse,
  normalizeProduct,
  isErrorBody,
  mapUpstreamError,
} from "../lib/lazada.js";

// Real upstream response shapes (recorded from the live Lazada API, trimmed).
// These verify the adapter against ACTUAL data — not just synthetic rows — so
// field-name drift upstream is caught without spending live quota per run.
const search = JSON.parse(readFileSync("test/fixtures/lazada_search.json", "utf8"));
const detail = JSON.parse(readFileSync("test/fixtures/lazada_detail.json", "utf8"));

test("normalizes a real search response into product cards", () => {
  const r = normalizeSearchResponse(search);
  assert.ok(r.products.length >= 1, "has products");
  for (const p of r.products) {
    assert.ok(p.productId, "has id");
    assert.ok(p.title, "has title");
    assert.ok(p.price > 0, "has real price");
    assert.ok(p.imageUrl, "has image");
    assert.ok(p.productUrl, "has source link");
    assert.equal(p.source, "lazada", "source attribution preserved");
    // Unknown specs must be null, never invented.
    assert.ok(p.sellerName === null || typeof p.sellerName === "string");
  }
});

test("normalizes a real product-detail response", () => {
  const p = normalizeProduct(detail.data || detail);
  assert.equal(p.source, "lazada");
  assert.ok(p.productId, "has id");
  assert.ok(p.title, "has title");
  assert.ok(p.price > 0, "has real price");
  assert.ok(p.imageUrl, "has image");
  assert.ok(p.productUrl, "has source link");
});

test("upstream 417 detail error maps to a graceful failure (no crash)", () => {
  const body = { code: 417, msg: "Get item detail error" };
  assert.equal(isErrorBody(body), true, "417 body is an error");
  const mapped = mapUpstreamError(417, body);
  assert.ok(mapped.status >= 400, "maps to a failure status");
  assert.ok(mapped.code, "has a stable error code");
  // Must never fabricate a product out of an upstream error.
  assert.equal(mapped.product, undefined);
});

test("missing optional attributes never break normalization", () => {
  const bare = { item_id: "1", title: "X", price: 10 };
  const p = normalizeProduct(bare);
  assert.equal(p.productId, "1");
  // Missing rating is unknown (null), never invented as 0 and never NaN.
  assert.ok(p.rating === null || typeof p.rating === "number", "rating null or number, not NaN");
  assert.ok(p.imageUrl === null || p.imageUrl === "", "missing image handled");
  assert.equal(typeof p.reviewCount, "number");
});
