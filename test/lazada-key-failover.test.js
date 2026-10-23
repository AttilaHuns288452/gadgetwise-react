import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { orderLazadaKeys } from "../lib/settings-crypto.js";
import { fetchWithKeyFailover } from "../lib/lazada.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("key pool is ordered, deduped, and environment keys come from the list first", () => {
  const pool = orderLazadaKeys("db-key", {
    LAZADA_API_KEYS: "k1,k2,,k1",
    LAZADA_API_KEY: "k3",
    OMKAR_LAZADA_API_KEY: "k4",
  });
  assert.deepEqual(pool, [
    { key: "db-key", source: "database" },
    { key: "k1", source: "environment" },
    { key: "k2", source: "environment" },
    { key: "k3", source: "environment" },
    { key: "k4", source: "environment" },
  ]);
  assert.deepEqual(orderLazadaKeys(null, {}), [], "no keys configured -> empty pool");
});

test("quota/auth rejections fall over to the next key and record the serving key", async () => {
  const seen = [];
  globalThis.fetch = async (_url, opts) => {
    const key = opts.headers["X-RapidAPI-Key"];
    seen.push(key);
    return new Response(key === "first" ? "{}" : '{"ok":true}', {
      status: key === "first" ? 429 : 200,
    });
  };
  const pool = [
    { key: "first", source: "environment" },
    { key: "second", source: "environment" },
  ];
  const r = await fetchWithKeyFailover("https://example.test/x", pool);
  assert.equal(r.upstream.status, 200);
  assert.equal(r.key, "second", "the key that served the request is reported");
  assert.deepEqual(seen, ["first", "second"]);
});

test("a rejection on the LAST key is surfaced, not swallowed", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 429 });
  const r = await fetchWithKeyFailover("https://example.test/x", [{ key: "only", source: "environment" }]);
  assert.equal(r.upstream.status, 429);
  assert.equal(r.rejected, true, "caller still sees the quota rejection");
});
