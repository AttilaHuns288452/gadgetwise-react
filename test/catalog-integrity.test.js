import { test } from "node:test";
import assert from "node:assert/strict";
import { curatedRowsForPublic } from "../src/lib/catalog.js";

test("public curated catalog quarantines propagation tests, invalid rows, and duplicates", () => {
  const rows = [
    { model: "ZZ Propagated Phone", category: "smartphones", price: 12345 },
    { model: "Real Phone", brand: "Acme", category: "smartphones", price: 12000, image: "https://example.test/phone.jpg" },
    { model: "Real Phone", brand: "Acme", category: "smartphones", price: 12000, image: "https://example.test/phone.jpg" },
    { model: "Placeholder Laptop", category: "laptops", price: 40000 },
    { model: "No price", category: "tablets", price: null },
  ];
  assert.deepEqual(curatedRowsForPublic(rows), [rows[1]]);
});
