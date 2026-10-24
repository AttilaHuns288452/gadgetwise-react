import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCategoryPlan } from "../src/lib/catalog.js";

const BASE = [
  { id: "smartphones", name: "Smartphones", query: "smartphone" },
  { id: "laptops", name: "Laptops", query: "laptop" },
];

test("a self-added category without a query is still a visible category", () => {
  const { list, queries } = mergeCategoryPlan(BASE, [
    { slug: "qwert", name: "qwert", query: null },
  ]);
  assert.ok(list.some((c) => c.id === "qwert"), "query-less category must appear in the list");
  assert.ok(!queries.some(([id]) => id === "qwert"), "but it must not trigger a marketplace fetch");
});

test("a self-added category with a query is visible and fetched", () => {
  const { list, queries } = mergeCategoryPlan(BASE, [
    { slug: "consoles", name: "Game Consoles", query: "game console" },
  ]);
  assert.ok(list.some((c) => c.id === "consoles" && c.name === "Game Consoles"));
  assert.ok(queries.some(([id, q]) => id === "consoles" && q === "game console"));
});

test("admin rows override defaults but never delete the ones they omit", () => {
  const { list, queries } = mergeCategoryPlan(BASE, [
    { slug: "laptops", name: "Gaming Laptops", query: "gaming laptop" },
  ]);
  const laptops = list.find((c) => c.id === "laptops");
  assert.equal(laptops.name, "Gaming Laptops", "rename reaches the public label");
  assert.deepEqual(queries.find(([id]) => id === "laptops"), ["laptops", "gaming laptop"]);
  assert.ok(list.some((c) => c.id === "smartphones"), "untouched default survives");
});

test("rows without a slug or name are ignored", () => {
  const { list } = mergeCategoryPlan(BASE, [{ name: "No slug" }, { slug: "x" }, {}]);
  assert.equal(list.length, BASE.length);
});
