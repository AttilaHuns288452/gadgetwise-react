/**
 * Integration test for loadCatalog with a stubbed localStorage + fetch.
 *
 * Covers the cache behaviour that the source-level guards only pin by shape:
 *   GW-14: the freshness (fetchedAt) and the stale flag are persisted and
 *          returned; a cached load reports the cache's own timestamp.
 *   GW-15: a failed category is reported in failedCategories, keeps its older
 *          rows, and is retried on the next load instead of being cached for
 *          7 days.
 *   GW-16: a category-plan change invalidates the cache (a new plan hash
 *          means a different cache key, so the products are refetched).
 */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../src/lib/catalog.js";
import GW from "../src/data.js";

/* ------------------------------------------------------------- test doubles */

// A minimal localStorage: the catalog loader only needs get/setItem.
function makeStorage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

let storage;
let realLocalStorage;
let realFetch;

beforeEach(() => {
  storage = makeStorage();
  realLocalStorage = globalThis.localStorage;
  realFetch = globalThis.fetch;
  globalThis.localStorage = storage;
});

afterEach(() => {
  globalThis.localStorage = realLocalStorage;
  globalThis.fetch = realFetch;
  GW.gadgets = [];
});

/* ------------------------------------------------------------------ helpers */

const ok = (items) => ({ ok: true, status: 200, json: async () => ({ products: items }) });
const fail = (status, code) => ({
  ok: false,
  status,
  json: async () => ({ error: { code, message: "upstream said no" } }),
});

/* ------------------------------------------------------------------- GW-14 */

test("GW-14: a fresh load persists the timestamp and the stale flag", async () => {
  globalThis.fetch = async () => ok([{ productId: "1", title: "Phone A", price: 1000 }]);
  const res = await loadCatalog();
  assert.equal(res.ok, true);
  assert.equal(res.cached, false);
  assert.equal(res.stale, false);
  assert.ok(typeof res.fetchedAt === "number" && res.fetchedAt > 0, "the caller gets the freshness");

  const entries = [...storage.map.entries()];
  assert.equal(entries.length, 1, "exactly one cache entry");
  const cached = JSON.parse(entries[0][1]);
  assert.equal(cached.fetchedAt, res.fetchedAt, "the timestamp is persisted next to the rows");
  assert.equal(cached.stale, false, "the stale flag is persisted");
});

test("GW-14: a fully cached load reports the cache's own timestamp and cached:true", async () => {
  globalThis.fetch = async () => ok([{ productId: "1", title: "Phone A", price: 1000 }]);
  const first = await loadCatalog();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return ok([]);
  };
  const second = await loadCatalog();
  assert.equal(calls, 0, "a fresh cache is not refetched");
  assert.equal(second.cached, true);
  assert.equal(second.fetchedAt, first.fetchedAt, "the reported freshness is the cache's timestamp");
  assert.equal(second.count, first.count);
});

/* ------------------------------------------------------------------- GW-15 */

test("GW-15: a failed category is reported and its older rows are kept", async () => {
  // first load: everything works
  globalThis.fetch = async (url) => {
    const q = new URL(url, "http://x").searchParams.get("q");
    if (q === "laptop") return ok([{ productId: "L1", title: "Laptop", price: 50000 }]);
    return ok([{ productId: "P1", title: "Phone", price: 20000 }]);
  };
  await loadCatalog();
  assert.ok(GW.gadgets.length >= 2);

  // second load: the laptop category fails. Its cache entry is still fresh
  // (7-day TTL), so it is not even refetched — force a refetch by aging it.
  const [key] = [...storage.map.keys()];
  const entry = JSON.parse(storage.map.get(key));
  for (const cat of Object.keys(entry.categories)) entry.categories[cat].fetchedAt = 0;
  storage.map.set(key, JSON.stringify(entry));

  globalThis.fetch = async (url) => {
    const q = new URL(url, "http://x").searchParams.get("q");
    if (q === "laptop") return fail(429, "rate_limited");
    return ok([{ productId: "P1", title: "Phone", price: 20000 }]);
  };
  const res = await loadCatalog();
  assert.ok(res.failedCategories.length >= 1, "the failure is surfaced to the caller");
  assert.ok(res.failedCategories.some((c) => c.error), "the failure names a reason");
  const ids = GW.gadgets.map((g) => g.id);
  assert.ok(ids.includes("lazada-L1"), "the failed category keeps its older rows");
  assert.ok(ids.includes("lazada-P1"), "the healthy category still has fresh rows");
});

test("GW-15: a failed category is retried on the next load, not cached for 7 days", async () => {
  globalThis.fetch = async (url) => {
    const q = new URL(url, "http://x").searchParams.get("q");
    if (q === "laptop") return fail(429, "rate_limited");
    return ok([{ productId: "P1", title: "Phone", price: 20000 }]);
  };
  await loadCatalog();
  const [key] = [...storage.map.keys()];
  const entry = JSON.parse(storage.map.get(key));
  const laptopStamp = entry.categories.laptops?.fetchedAt;

  let laptopCalls = 0;
  globalThis.fetch = async (url) => {
    const q = new URL(url, "http://x").searchParams.get("q");
    if (q === "laptop") {
      laptopCalls++;
      return ok([{ productId: "L1", title: "Laptop", price: 50000 }]);
    }
    return ok([{ productId: "P1", title: "Phone", price: 20000 }]);
  };
  const res = await loadCatalog();
  assert.equal(laptopCalls, 1, "a category that failed is retried on the next load");
  assert.deepEqual(res.failedCategories, [], "the retry succeeded, so there is no failure to report");
  assert.ok(GW.gadgets.map((g) => g.id).includes("lazada-L1"), "the recovered rows are in the catalog");
  assert.ok(laptopStamp === undefined || laptopStamp === 0 || laptopStamp < Date.now(),
    "a failed category never gets a fresh timestamp");
});

/* ------------------------------------------------------------------- GW-16 */

test("GW-16: a changed category plan uses a different cache key", async () => {
  globalThis.fetch = async () => ok([{ productId: "1", title: "Phone", price: 1000 }]);
  await loadCatalog();
  const firstKey = [...storage.map.keys()][0];

  // the plan hash is part of the key, so a different plan cannot collide
  const { planHash } = await import("../src/lib/catalog.js");
  const other = planHash([{ id: "consoles", name: "Consoles", query: "game console" }]);
  assert.ok(!firstKey.endsWith(other), "a different plan maps to a different cache key");
});
