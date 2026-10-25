/**
 * Source-level regression guards for the UI fixes that cannot be unit-tested
 * without a DOM. These pin the behaviour in the source so a later refactor
 * cannot silently reintroduce the defect.
 *
 *   GW-10: the "Product search is temporarily unavailable" state needs an
 *          explicit Retry button.
 *   GW-11: the live search debounces, aborts, and pages on demand.
 *   GW-12: the live section is labelled as an independent, unfiltered
 *          marketplace search with its own count.
 *   GW-13: a failed search is an error state, not an empty result list.
 *   GW-30: per-product state is keyed by id so the previous product cannot
 *          render under a new route.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const live = read("src/components/LiveSearch.jsx");
const detail = read("src/pages/GadgetDetail.jsx");
const catalog = read("src/pages/Catalog.jsx");


test("GW-10: the live search error state offers an explicit retry", () => {
  assert.match(live, /Retry search/, "the error state has a retry button");
  // the retry must actually re-run the search
  assert.match(live, /onClick=\{\(\) => run\(state\.loadedQuery \|\| q\)\}/,
    "the retry button re-runs the search");
});


test("GW-11: the live search debounces the query", () => {
  assert.match(live, /const DEBOUNCE_MS = 350/, "a 350ms debounce is configured");
  assert.match(live, /setTimeout\(\(\) => \{/, "the fetch is scheduled behind the debounce");
  assert.match(live, /clearTimeout\(t\)/, "the pending timer is cleared when the query changes");
});

test("GW-11: the live search aborts the in-flight request on a new query", () => {
  assert.match(live, /new AbortController\(\)/, "an AbortController is used");
  assert.match(live, /abortRef\.current\?\.abort\(\)/, "the previous request is aborted");
  assert.match(live, /signal: ctrl\.signal/, "the signal is handed to the fetch");
  assert.match(live, /if \(ctrl\.signal\.aborted \|\| res\.aborted\) return;/,
    "the response is re-checked for cancellation after the await");
});

test("GW-11: the live search no longer auto-fetches a fixed number of pages", () => {
  assert.ok(!/MAX_PAGES/.test(live), "there is no automatic multi-page loop");
  assert.ok(!/for \(let page = 1; page <= /.test(live), "no page loop runs automatically");
  assert.match(live, /Load more listings/, "further pages are loaded on user demand");
  assert.match(live, /const loadMore = async/, "the load-more handler exists");
});


test("GW-12: the live section says it is independent of the catalog filters", () => {
  assert.match(live, /Independent marketplace search/,
    "the live section is labelled as an independent search");
  assert.match(live, /catalog filters above do not apply here/,
    "the section states that the catalog filters do not apply");
});

test("GW-12: the live section shows its own result count", () => {
  assert.match(live, /live listing\$\{state\.items\.length === 1 \? "" : "s"\} found/,
    "the live section reports how many listings it found");
});


test("GW-13: a failed live search is an error state, not an empty result list", () => {
  assert.match(live, /status: "error"/, "the error state exists");
  assert.ok(!/results\.push\(\{ products: \[\] \}\)/.test(live),
    "an exception is no longer turned into an empty product list");
  // the "no listings" copy must not be reachable from the error branch
  const errIdx = live.indexOf('status: "error"');
  const emptyIdx = live.indexOf("No live listings found");
  assert.ok(errIdx > -1 && emptyIdx > -1);
  assert.ok(emptyIdx > errIdx, "the empty-result copy belongs to the ready state only");
});

test("GW-13: a new query clears the previous query's results", () => {
  assert.match(live, /if \(!append\) itemsRef\.current = \[\];/,
    "the previous query's items are dropped when a new query starts");
  assert.match(live, /items: append \? s\.items : \[\]/,
    "the rendered list is cleared for a new query too");
});


test("GW-30: the detail page keys its per-product state by id", () => {
  assert.match(detail, /const fetched = loaded\.id === id \? loaded\.gadget : null;/,
    "the fetched product is only used when its id matches the route");
  assert.match(detail, /const extra = loaded\.id === id \? loaded\.extra : \[\];/,
    "the loaded reviews are only used when their id matches the route");
  assert.match(detail, /const reviewsLoaded = loaded\.id === id \? loaded\.reviewsLoaded : false;/,
    "the reviews-loaded flag is only used when its id matches the route");
});

test("GW-30: the detail page verifies the returned id before rendering it", () => {
  assert.match(detail, /if \(res\?\.gadget && res\.gadget\.id !== id\) return;/,
    "a response for another id is discarded");
});

test("GW-30: a late response for a previous id cannot overwrite the current one", () => {
  assert.match(detail, /if \(cancelled\) return;/, "the effect cancels on unmount/id change");
  assert.match(detail, /cancelled = true;/, "the cancellation flag is set on cleanup");
});


test("GW-18: the detail page renders a retry for a failed lookup, not 'not found'", () => {
  assert.match(detail, /Could not load this listing/, "a failed lookup has its own heading");
  assert.match(detail, /Try again/, "the failed lookup offers a retry");
  assert.match(detail, /setRetryTick\(\(n\) => n \+ 1\)/, "the retry re-runs the lookup");
  // the error branch is separate from the not-found branch
  assert.match(detail, /listingState\.status === "error"/, "the error state is branched on");
  // and the not-found copy is only rendered after the error branch
  const errIdx = detail.indexOf('listingState.status === "error"');
  const nfIdx = detail.indexOf("<h1>Gadget not found</h1>");
  assert.ok(errIdx > -1 && nfIdx > -1, "both branches exist");
  assert.ok(nfIdx > errIdx, "the not-found copy comes after the error branch, so it is only reached for a real absence");
});


test("GW-02: the catalog applies every finite ceiling, not only those under 100000", () => {
  assert.ok(!/max < 100000/.test(catalog), "the 100000 special case is gone");
  assert.ok(!/maxPrice !== "100000"/.test(catalog), "100000 is no longer a magic 'no ceiling' value");
  assert.match(catalog, /withinPriceRange\(g\.price, null, max\)/, "the max ceiling is applied as a bound");
  assert.match(catalog, /withinPriceRange\(g\.price, min, null\)/, "the min floor is applied as a bound");
});

test("GW-02: an invalid price range is shown to the user", () => {
  assert.match(catalog, /\{range\.error && \(/, "the range error is rendered");
  assert.match(catalog, /role="alert"/, "the error is announced");
  assert.match(catalog, /parsePriceRange\(minPrice, maxPrice\)/, "the range is parsed by the shared helper");
});
