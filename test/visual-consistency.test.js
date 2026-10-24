/**
 * Visual-consistency guard. These are SOURCE-level assertions: the pass that
 * unified the two button systems, deleted the dead CSS, normalized the h1
 * scale, and fixed the contrast/a11y/empty-state findings can silently regress
 * the next time someone adds a `btn-primary` class or a `--tscale` var.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p) => readFileSync(p, "utf8");
const css = read("src/index.css");

// every .jsx/.js under src/
const srcFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(e.name)) srcFiles.push(p);
  }
})("src");
const allSrc = srcFiles.map((f) => ({ f, s: read(f) }));

test("the CSS button family is gone; buttons come from the JS constants", () => {
  for (const dead of [".btn-primary", ".btn-ghost", ".btn-amber", ".btn-hero", ".btn-hero-ghost"]) {
    assert.ok(!css.includes(dead), `index.css must not define ${dead}`);
  }
  for (const { f, s } of allSrc) {
    assert.ok(
      !/className="[^"]*\bbtn-(primary|ghost|amber|hero)\b/.test(s),
      `${f} must not use the removed CSS button classes`,
    );
  }
  // the one button system that survives
  assert.match(read("src/components/ui.jsx"), /export const btnPrimaryCls/, "btnPrimaryCls is the canonical button");
});

test("dead CSS and dead tokens stay deleted", () => {
  for (const dead of [".btn-amber", ".btn-hero", ".success-pop", "--color-warning", "--color-warning-soft"]) {
    assert.ok(!css.includes(dead), `index.css must not contain ${dead}`);
  }
  for (const { f, s } of allSrc) {
    assert.ok(!s.includes("success-pop"), `${f} must not use success-pop`);
  }
});

test("the undefined --tscale / unused --ui-scale variables stay gone", () => {
  assert.ok(!css.includes("--ui-scale"), "index.css must not define --ui-scale");
  for (const { f, s } of allSrc) {
    assert.ok(!s.includes("--tscale"), `${f} must not reference the undefined --tscale`);
  }
});

test("page titles use the shared h1 scale instead of per-page overrides", () => {
  // the shared clamp lives in index.css
  assert.match(css, /h1 \{ font-size: clamp\(/, "index.css owns the h1 scale");
  // the per-page overrides that were normalized
  for (const p of [
    "src/pages/Wishlist.jsx",
    "src/pages/ReviewHistory.jsx",
    "src/pages/ComparisonHistory.jsx",
    "src/pages/Profile.jsx",
    "src/pages/PublicProfile.jsx",
  ]) {
    const s = read(p);
    assert.ok(!/text-\[2\.25rem\]/.test(s), `${p} must not hardcode an h1 size`);
  }
  for (const p of ["src/pages/Compare.jsx", "src/pages/Quiz.jsx", "src/components/ui.jsx"]) {
    assert.ok(!/text-\[calc\(/.test(read(p)), `${p} must not hardcode an h1 size`);
  }
  assert.ok(!/text-\[1\.85rem\]/.test(read("src/components/ui.jsx")), "AuthLayout must not hardcode an h1 size");
  // the hero is a hero, not a page title: it keeps its own scale
  assert.match(read("src/pages/Home.jsx"), /<h1 className="anim-fade-up/, "the home hero keeps its own headline scale");
});

test("error and notice boxes use the WCAG AA danger/warning tokens", () => {
  for (const p of ["src/pages/Login.jsx", "src/pages/Register.jsx", "src/pages/ResetPassword.jsx"]) {
    const s = read(p);
    assert.ok(!/bg-red-50/.test(s), `${p} must not use bg-red-50`);
    assert.ok(!/text-red-700/.test(s), `${p} must not use text-red-700`);
    assert.ok(!/bg-amber-50/.test(s), `${p} must not use bg-amber-50`);
    assert.ok(!/text-amber-800/.test(s), `${p} must not use text-amber-800`);
  }
  // the replacement pairs
  const login = read("src/pages/Login.jsx");
  assert.ok(login.includes("text-[#b3372e]") && login.includes("bg-[#f9e9e7]"), "Login uses the danger tokens");
  assert.ok(login.includes("text-[#6B4E12]") && login.includes("bg-[#FFF8E6]"), "Login uses the warning tokens");
});

test("every admin icon-only button carries an aria-label", () => {
  const admin = read("src/pages/Admin.jsx");
  // The icon-only admin buttons are the iconBtn-styled ones that carry a
  // title= (the text buttons styled with iconBtn, e.g. "Cancel", do not).
  const iconOnly = admin.match(/<button className=\{iconBtn\} title="[^"]*"[^>]*>/g) || [];
  assert.ok(iconOnly.length >= 8, `expected the admin icon buttons to still exist, found ${iconOnly.length}`);
  for (const b of iconOnly) {
    assert.match(b, /aria-label=/, `icon-only admin button needs an aria-label: ${b}`);
  }
});

test("an empty-but-successful catalog is not reported as a filter miss", () => {
  const catalog = read("src/pages/Catalog.jsx");
  const app = read("src/App.jsx");
  // the honest empty state exists
  assert.match(catalog, /catalogEmpty/, "Catalog branches on catalogEmpty");
  assert.match(read("src/components/ui.jsx"), /The catalog is empty right now/, "the empty state says so plainly");
  // and the filter-miss copy only appears when the scope actually has products
  assert.match(catalog, /scope\.length === 0 \?/, "the empty-scope case is distinguished from a filter miss");
  assert.match(app, /setCatalogEmpty\(catOk\)/, "App records a successful-but-empty catalog");
});
