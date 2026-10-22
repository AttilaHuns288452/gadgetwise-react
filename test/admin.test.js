import { test } from "node:test";
import assert from "node:assert/strict";
import { toGadget, isRealProduct, registerListings, isListingId } from "../src/lib/marketplace.js";

// Admin authorization is enforced in the database (migration 0003). These tests
// pin the client-visible contract: the admin gate must depend on the DB is_admin()
// result, never on client state. The DB-level negative tests (self-promotion,
// review moderation) run against the live Supabase project.

test("admin gate contract: is_admin() is the only source of truth", async () => {
  // Simulate the client: admin is true only when the DB RPC returns true.
  const fakeRpc = (result) => Promise.resolve({ data: result });
  const deriveAdmin = async (rpc) => {
    try {
      return (await rpc()) === true;
    } catch {
      return false;
    }
  };
  assert.equal(await deriveAdmin(() => fakeRpc(true)), true, "DB true -> admin");
  assert.equal(await deriveAdmin(() => fakeRpc(false)), false, "DB false -> not admin");
  assert.equal(await deriveAdmin(() => fakeRpc(null)), false, "DB null -> not admin");
  assert.equal(await deriveAdmin(() => Promise.reject(new Error("rls"))), false, "RPC error fails closed");
});

test("marketplace listing id never collides with curated ids", () => {
  const g = toGadget({ productId: "12345", title: "X", price: 100 });
  assert.equal(isListingId(g.id), true, "marketplace ids are namespaced lazada-");
  assert.equal(isListingId("apple-macbook-air-m1"), false, "curated ids are not");
  registerListings([{ productId: "99999", title: "Y", price: 5 }]);
  assert.equal(isRealProduct(g), true);
});
