import { test } from "node:test";
import assert from "node:assert/strict";
import GW from "../src/data.js";

test("marketplace promo stamps are stripped from display titles", () => {
  assert.equal(
    GW.cleanTitle("realme （ new ! ） realme 9pro+ cellphone 12+512"),
    "realme realme 9pro+ cellphone 12+512",
  );
  assert.equal(GW.cleanTitle("Honor X7e (HOT) 7500mAh"), "Honor X7e 7500mAh");
});

test("real specification parentheses are kept", () => {
  assert.equal(GW.cleanTitle("HONOR X7e (12GB+128GB) 7500mAh"), "HONOR X7e (12GB+128GB) 7500mAh");
  assert.equal(GW.cleanTitle("Xiaomi Redmi Note 13 (8/256)"), "Xiaomi Redmi Note 13 (8/256)");
});

test("whitespace is collapsed and full-width parens normalized", () => {
  assert.equal(GW.cleanTitle("  Pixel   9  （ 8GB ）  "), "Pixel 9 ( 8GB )");
});

test("getCategory never returns null so .name reads cannot blank a page", () => {
  assert.equal(typeof GW.getCategory("does-not-exist").name, "string");
  assert.equal(GW.getCategory("does-not-exist").name, "does-not-exist");
  assert.equal(GW.getCategory(undefined).name, "Other");
  // known categories still resolve normally
  assert.ok(GW.getCategory("smartphones").name.length > 0);
});

test("displayName keeps the brand exactly once", () => {
  const g = { brand: "Xiaomi", model: "Xiaomi REDMI Turbo 5 Max" };
  assert.equal(GW.displayName(g), "Xiaomi REDMI Turbo 5 Max");
  const h = { brand: "HONOR", model: "X7e (12GB+128GB)" };
  assert.equal(GW.displayName(h), "HONOR X7e (12GB+128GB)");
});
