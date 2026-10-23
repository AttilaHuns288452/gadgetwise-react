import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/lazada/product.js";

const realFetch = globalThis.fetch;
const realKeys = process.env.LAZADA_API_KEYS;
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKeys === undefined) delete process.env.LAZADA_API_KEYS;
  else process.env.LAZADA_API_KEYS = realKeys;
});

function mockRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  r.setHeader = () => r;
  return r;
}

test("a listing that vanished upstream becomes an honest 404, not a 502 search failure", async () => {
  process.env.LAZADA_API_KEYS = "test-key";
  globalThis.fetch = async () => new Response('{"code":417,"msg":"Get item detail error"}', { status: 417 });
  const res = mockRes();
  await handler({ method: "GET", query: { id: "15398622092", marketplace: "ph" } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "product_unavailable");
  assert.match(res.body.error.message, /no longer available/i);
});

test("a valid live listing still resolves to a product", async () => {
  process.env.LAZADA_API_KEYS = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ code: 200, msg: "success", data: { item_id: 4242, title: "Test Phone", brand: "Acme", price: 1000, img: "https://example.test/p.png" } }),
      { status: 200 },
    );
  const res = mockRes();
  await handler({ method: "GET", query: { id: "4242", marketplace: "ph" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.product.productId, "4242");
});
