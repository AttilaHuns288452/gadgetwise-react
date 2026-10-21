import { test } from "node:test";
import assert from "node:assert/strict";
import { toGadget, registerListings, getListing, isListingId } from "../src/lib/marketplace.js";
import GW from "../src/data.js";

const RAW = {
  source: "lazada",
  productId: "15458423476",
  title: "Apple MacBook Air (13-inch) M5 chip",
  brandName: "Apple",
  productUrl: "https://www.lazada.com.ph/products/-i15458423476.html",
  imageUrl: "https://img/x.jpg",
  currency: "PHP",
  price: 86890,
  originalPrice: 99990,
  rating: 4.9,
  reviewCount: 12,
  sellerName: "Apple Store PH",
  soldCount: 5,
  inStock: true,
  isSponsored: false,
};

test("toGadget maps real fields exactly", () => {
  const g = toGadget(RAW);
  assert.equal(g.id, "lazada-15458423476");
  assert.equal(g.price, 86890);
  assert.equal(g.rating, 4.9);
  assert.equal(g.reviewCount, 12);
  assert.equal(g.image, "https://img/x.jpg");
  assert.equal(g.productUrl, RAW.productUrl, "source link preserved for 'View on Lazada'");
  assert.equal(g.brand, "Apple");
  assert.equal(g.category, "laptops", "inferred from title");
});

test("toGadget flags marketplace so neutral values are not read as curated", () => {
  const g = toGadget(RAW);
  assert.equal(g.marketplace, true);
  assert.equal(g.value.warrantyYears, 0, "unknown warranty must not be fabricated");
  assert.equal(g.releaseYear, null, "unknown year stays null, not invented");
  assert.equal(g.battery, 0, "unknown battery contributes 0, not a fake advantage");
});

test("toGadget handles a product with no rating/brand without crashing", () => {
  const g = toGadget({ productId: "1", title: "Mystery Thing", price: 100, rating: 0 });
  assert.equal(g.rating, 0);
  assert.equal(g.brand, "Unknown");
  assert.ok(typeof g.scored.performance === "number", "scored fields present so detail .toFixed never crashes");
  assert.ok(typeof g.value.repairabilityLabel === "string");
});

test("GW.getGadget resolves registered marketplace listings (the click-through seam)", () => {
  registerListings([RAW]);
  const found = GW.getGadget("lazada-15458423476");
  assert.ok(found, "GW.getGadget must find the live listing so /#/g/:id renders our page");
  assert.equal(found.id, "lazada-15458423476");
  assert.equal(getListing("lazada-15458423476").price, 86890);
});

test("GW.getGadget still returns null for unknown ids", () => {
  assert.equal(GW.getGadget("does-not-exist"), null);
});

test("monthly cost formula works on real prices", () => {
  const g = toGadget(RAW);
  assert.ok(Math.abs(GW.monthlyCost(g) - 86890 / 36) < 1e-9);
});

test("isListingId distinguishes marketplace ids", () => {
  assert.equal(isListingId("lazada-123"), true);
  assert.equal(isListingId("apple-macbook-air-m1"), false);
});
