import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Claims + comparison-correctness guard.
 *
 * These are SOURCE-level assertions: the marketplace catalog is live data
 * (ratings come from Lazada, not from GadgetWise users), so the wording on
 * the public pages and the winner selection in Compare are contracts that
 * can silently regress when someone edits the copy or the row model.
 */
const read = (p) => readFileSync(p, "utf8");
const compare = read("src/pages/Compare.jsx");
const home = read("src/pages/Home.jsx");
const register = read("src/pages/Register.jsx");
const login = read("src/pages/Login.jsx");

// --- GW-20 / GW-21: no page may claim marketplace data is student data ---
test("no public page calls marketplace ratings student reviews", () => {
  for (const [name, src] of [["Home.jsx", home], ["Compare.jsx", compare]]) {
    assert.ok(!/student reviews/i.test(src), `${name} must not claim marketplace reviews are student reviews`);
    assert.ok(!/Top rated by students/i.test(src), `${name} must not say "Top rated by students"`);
    assert.ok(!/Students rate/i.test(src), `${name} must not attribute a rating to students`);
  }
  // and the honest wording is actually present
  assert.match(home, /marketplace reviews/i, "Home says the reviews are marketplace reviews");
  assert.match(home, /marketplace rating/i, "Home says the rating is a marketplace rating");
});

test("warranty and repair paths are qualified with 'where available'", () => {
  // A blanket promise ("every entry names its repair path") is a lie: the
  // marketplace rarely carries warranty or repair data.
  assert.ok(!/Every catalog entry names its repair path/i.test(home), "Home must not promise a repair path for every entry");
  assert.ok(!/Six categories, each with real specs/i.test(home), "Home must not promise verified specs for every entry");
  assert.match(home, /where available/i, "Home qualifies the repair-path claim");
});

// --- GW-25: the summary sentence must follow the rating ordering ---
test("the compare summary names the value winner and the rating winner separately", () => {
  // The Performance to Cost index is a value score, so its winner is a value
  // winner, never "the highest rated".
  assert.match(compare, /has the best Performance to Cost score/, "the summary states the value score winner");
  assert.match(compare, /Marketplace ratings put/, "the summary states the rating winner separately");
  // the rating winner is chosen from the rated products only
  assert.match(compare, /list\.filter\(hasRating\)/, "the rating winner comes from the rated products only");
});

// --- GW-24: an unrated product is unknown, not 0.0 stars ---
test("an unrated product never wins a rating comparison and never shows 0.0", () => {
  assert.match(compare, /const hasRating = \(g\) => num\(g\?\.rating\) != null && g\.rating > 0/, "hasRating gates on a real rating");
  assert.match(compare, /ratingText/, "the header uses the shared rating text helper");
  assert.match(compare, /hasRating\(g\) \? `\$\{g\.rating\.toFixed\(1\)\}★ \(\$\{g\.reviewCount\}\)` : "Not available"/,
    "an unrated header says 'Not available', not 0.0");
  // the row model uses the same gate, so an unrated cell is "Not available"
  assert.match(compare, /add\("Rating", "high", "Higher rating", \(g\) => \(hasRating\(g\) \? g\.rating : null\)/,
    "the rating row excludes unrated products from winner selection");
  // and the "highest rated" line has an unrated fallback
  assert.match(compare, /Highest marketplace rating: <strong>Not available<\/strong>/,
    "the at-a-glance line has an unrated fallback");
});

// --- GW-26: the selection survives a refresh; a missing id is a visible slot ---
test("the compare selection is persisted and a missing id stays visible", () => {
  assert.match(compare, /gw_compare_selection/, "the selection is stored under a stable key");
  assert.match(compare, /readSavedIds\(\)/, "the selection is restored from storage");
  assert.match(compare, /writeSavedIds\(picked\)/, "the selection is written back");
  // an id that cannot be resolved renders as a slot, it does not vanish
  assert.match(compare, /Could not load/, "an unresolvable id renders a 'could not load' slot");
  assert.match(compare, /slots\.filter\(\(s\) => s\.g\)/, "the table and the columns use the same slot list");
});

// --- GW-27: removing a seeded id removes it from the selection ---
test("removing a url-seeded id updates the authoritative selection", () => {
  assert.match(compare, /const next = picked\.filter\(\(x\) => x !== id\)/, "remove drops the id from the selection");
  assert.match(compare, /params\.set\("ids", next\.join\(","\)\)/,
    "remove also rewrites the ?ids= link from the SAME list, so the id cannot come back");
});

// --- GW-22: counts come from categories that actually have products ---
test("home counts only categories that hold products", () => {
  assert.match(home, /GW\.categories\.filter\(\(c\) => GW\.gadgetsInCategory\(c\.id\)\.length > 0\)\.length/,
    "the 'categories covered' stat counts only product-bearing categories");
  assert.match(home, /const usable = GW\.categories\.filter\(\(c\) => hideCounts \|\| GW\.gadgetsInCategory\(c\.id\)\.length > 0\)/,
    "the category tiles only render categories that hold products");
});

// --- GW-32: the register form shows the whole password policy up front ---
test("the register form shows the complete password policy before entry", () => {
  for (const rule of ["lowercase", "uppercase", "number", "symbol"]) {
    assert.match(register, new RegExp(rule, "i"), `the password rules mention ${rule}`);
  }
  // the policy is enforced in one shared place, and the errors stay specific
  assert.match(register, /passwordPolicyError\(password\)/, "validation uses the shared policy check");
});

// --- GW-33: the next param survives the hop between the two auth forms ---
test("the login and register links carry the next param through", () => {
  assert.match(login, /\/register\?next=\$\{encodeURIComponent\(carryNext\)\}/, "Login carries ?next= to Register");
  assert.match(register, /\/login\?next=\$\{encodeURIComponent\(carryNext\)\}/, "Register carries ?next= to Login");
  // the carried value is validated first: an unsafe next is dropped, not forwarded
  for (const [name, src] of [["Login.jsx", login], ["Register.jsx", register]]) {
    assert.match(src, /safeNext\(rawNext\) === rawNext/, `${name} only carries a validated next param`);
  }
});
