import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW } from "../lib.js";
import { parsePriceRange, priceSortValue, withinPriceRange } from "../lib/catalog.js";
import { GadgetCard, CatalogLoadingCard, CatalogErrorCard, StaleCatalogNote, btnPrimaryCls, btnOutlineCls } from "../components/ui.jsx";
import LiveSearch from "../components/LiveSearch.jsx";

/* Filter behavior ported 1:1 from the prototype (js/catalog.js FEATURES/apply). */
const FEATURES = {
  long: (g) => /([8-9]\d*|\d{2,})\s*(h|hr|hour)/i.test(g.specs.Battery || ""),
  // A listing with an UNKNOWN price cannot be claimed to be "under ₱15,000" —
  // null < 15000 is true, which would be a lie.
  budget: (g) => withinPriceRange(g.price, null, 15000),
  durable: (g) => typeof g.scored.durability === "number" && g.scored.durability >= 7,
};
const FEATURE_LABELS = [
  ["long", "Long battery (8h+)"],
  ["budget", "Under ₱15,000"],
  ["durable", "Build & protection (7+)"],
];
// filters follow the same category list the catalog fetches (admin-editable)
const CATS = [["", "All"]];
const catOptions = () => [...CATS, ...GW.categories.filter((c) => GW.gadgets.some((g) => g.category === c.id)).map((c) => [c.id, c.name])];
const SORTS = [
  ["featured", "Featured"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["rating", "Rating"],
  ["monthly", "Cost per month"],
];

const toggle = (setter) => (val) =>
  setter((prev) => {
    const n = new Set(prev);
    n.has(val) ? n.delete(val) : n.add(val);
    return n;
  });

export default function Catalog({ compare, onCompare, catalogLoading, catalogError, catalogEmpty }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat") || "";
  const spQ = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const [q, setQ] = useState(spQ);
  const [sort, setSort] = useState("featured");
  const [minPrice, setMinPrice] = useState("0");
  // ?max= (from the home budget CTA) pre-sets the price ceiling. An EMPTY
  // input means "no ceiling" and is a different thing from a number.
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("max") || "");
  const [feats, setFeats] = useState(() => new Set());
  const [brands, setBrands] = useState(() => new Set());
  // ponytail: phones get a collapsed filter panel; from lg up the sidebar is
  // always open, so this flag never changes the desktop layout.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // when the panel closes on a phone, the results below must come into view
  const resultsRef = useRef(null);

  // ponytail: resync only when the URL param value changes, so typing never fights navigation
  useEffect(() => setQ(spQ), [spQ]);

  const setCat = (id) => {
    const p = new URLSearchParams(searchParams);
    if (id) p.set("cat", id);
    else p.delete("cat");
    setSearchParams(p, { replace: true });
  };

  const clearAll = () => {
    setQ("");
    setMinPrice("0");
    setMaxPrice("");
    setFeats(new Set());
    setBrands(new Set());
    setCat("");
  };

  const scope = cat ? GW.gadgetsInCategory(cat) : GW.gadgets;
  const brandList = [...new Set(scope.map((g) => g.brand))].filter((b) => b && b !== "Unknown").sort();

  // every finite, non-negative ceiling is applied. An empty input means
  // "no ceiling" and is NOT the same as a number — the old code skipped any
  // max >= 100000, so a ₱120,000 ceiling was silently ignored.
  const range = parsePriceRange(minPrice, maxPrice);
  const { min, max } = range;
  const results = (() => {
    let list = scope.slice();
    if (range.error) return list; // invalid range: show the error, do not filter
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((g) =>
        `${g.brand} ${g.model} ${g.summary} ${GW.getCategory(g.category).name} ${g.tagline}`.toLowerCase().includes(s)
      );
    }
    if (brands.size) list = list.filter((g) => brands.has(g.brand));
    // a listing with an unknown price cannot satisfy a price bound.
    // A floor of 0 is no floor (same as before), so an untouched filter panel
    // does not hide price-unknown listings.
    if (min != null && min > 0) list = list.filter((g) => withinPriceRange(g.price, min, null));
    if (max != null) list = list.filter((g) => withinPriceRange(g.price, null, max));
    for (const [key, fn] of Object.entries(FEATURES)) if (feats.has(key)) list = list.filter(fn);
    switch (sort) {
      case "price-asc": list.sort((a, b) => priceSortValue(a) - priceSortValue(b)); break;
      case "price-desc": list.sort((a, b) => priceSortValue(b) - priceSortValue(a)); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "monthly": list.sort((a, b) => priceSortValue(a) - priceSortValue(b)); break;
      default: list.sort((a, b) => b.rating * Math.log(b.reviewCount + 2) - a.rating * Math.log(a.reviewCount + 2));
    }
    return list;
  })();

  const meta = [
    `${results.length} gadget${results.length === 1 ? "" : "s"}`,
    ...(cat && GW.getCategory(cat) ? [`in ${GW.getCategory(cat).name}`] : []),
    ...(q ? [`matching “${q}”`] : []),
  ].join(" · ");

  // ponytail: sizing overrides on .btn/.field are plain utilities — utilities layer beats components layer in v4, no ! needed
  const groupCls = "mt-4 border-t border-line pt-4";
  const headCls = "mb-3 text-xs font-bold uppercase tracking-[0.05em] text-ink";
  const rowCls = "flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink2 hover:text-ink";

  // how many filters are on, so the collapsed toggle can say so
  const activeCount =
    (cat ? 1 : 0) +
    feats.size +
    brands.size +
    (minPrice && minPrice !== "0" ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <section className="section py-8 lg:py-12">
      <div className="mb-6 lg:mb-8">
        <h1>Browse Gadgets</h1>
        {/* instructional copy: desktop guidance, pure chrome on a phone */}
        <p className="hidden mt-2 text-sm leading-relaxed text-ink2 sm:block lg:mt-3 lg:text-base lg:leading-normal">
          Search, filter and sort the catalog. Tick “Compare” on a card to add it to the compare tray below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
        {/* Filters. On phones the whole panel collapses behind one toggle —
            stacked open it pushed the first product card ~3100px down. From lg
            up the sidebar is always visible, exactly as before. */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto" aria-label="Filters">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-line-strong bg-white px-4 py-3 text-sm font-semibold text-ink lg:hidden"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-ink3" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-dark">
                  {activeCount}
                </span>
              )}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 text-ink3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div
            id="catalog-filter-panel"
            className={`${filtersOpen ? "block" : "hidden"} mt-3 lg:mt-0 lg:block`}
          >
            <div className="card p-5">
              <div>
                <h4 className={headCls}>CATEGORY</h4>
                <div>
                  {catOptions().map(([id, label]) => (
                    <label key={id || "all"} className={rowCls}>
                      <input
                        type="radio"
                        name="fcat"
                        checked={cat === id}
                        onChange={() => setCat(id)}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      {label}
                      <span className="ml-auto text-xs text-ink3">
                        {id ? GW.gadgetsInCategory(id).length : GW.gadgets.length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={groupCls}>
                <h4 className={headCls}>PRICE RANGE (₱)</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    aria-label="Minimum price"
                    aria-invalid={range.error ? "true" : undefined}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full min-w-0 rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                  />
                  <span className="text-ink3">–</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    aria-label="Maximum price"
                    aria-invalid={range.error ? "true" : undefined}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full min-w-0 rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                  />
                </div>
                {/* an invalid range is stated, not silently ignored. */}
                {range.error && (
                  <p role="alert" className="mt-2 text-sm text-[#b3372e]">
                    {range.error}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink3">Leave a box empty for no limit.</p>
              </div>

              <div className={groupCls}>
                <h4 className={headCls}>FEATURES</h4>
                <div>
                  {FEATURE_LABELS.map(([key, label]) => (
                    <label key={key} className={rowCls}>
                      <input
                        type="checkbox"
                        checked={feats.has(key)}
                        onChange={() => toggle(setFeats)(key)}
                        className="h-4 w-4 shrink-0 rounded accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className={groupCls}>
                <h4 className={headCls}>BRAND</h4>
                <div className="max-h-64 overflow-y-auto lg:max-h-none lg:overflow-visible">
                  {brandList.map((b) => (
                    <label key={b} className={rowCls}>
                      <input
                        type="checkbox"
                        checked={brands.has(b)}
                        onChange={() => toggle(setBrands)(b)}
                        className="h-4 w-4 shrink-0 rounded accent-primary"
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </div>

              <div className={groupCls}>
                <button type="button" onClick={clearAll} className={btnOutlineCls + " w-full !px-3 !py-2 !text-sm"}>
                  Clear all filters
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-primary-soft p-5">
              <h4 className="mb-1.5 text-base font-bold text-ink">Can't decide?</h4>
              <p className="mb-3 text-sm text-ink2">Get a ranked shortlist for your budget and course load.</p>
              <Link to="/recommend" className={btnPrimaryCls + " !px-4 !py-2 !text-sm"}>
                Get recommendations →
              </Link>
            </div>

            {/* ponytail: on phones the panel is the whole screen, so it needs
                its own way out — the results sit below the fold otherwise */}
            <button
              type="button"
              onClick={() => {
                setFiltersOpen(false);
                resultsRef.current?.scrollIntoView({ block: "start" });
              }}
              className={btnPrimaryCls + " mt-4 w-full !px-4 !py-3 !text-sm lg:hidden"}
            >
              Show {results.length} gadget{results.length === 1 ? "" : "s"}
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0" ref={resultsRef}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full min-w-0 sm:w-auto sm:max-w-[420px] sm:flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink3"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search gadgets, brands, features…"
                aria-label="Filter gadgets in catalog"
                className="field rounded-lg py-2.5 pl-10 pr-4"
              />
            </div>
            {/* ponytail: on phones the sort select fills the row instead of
                hugging its label and leaving half the width empty */}
            <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
              <label htmlFor="catalog-sort" className="shrink-0 text-sm text-ink3">
                Sort
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-w-0 flex-1 rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-ink sm:flex-none"
              >
                {SORTS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-3 text-sm text-ink3 [overflow-wrap:anywhere]">{meta}</p>
          <StaleCatalogNote />

          <LiveSearch query={q} />

          {/* ponytail: on phones the chips become one horizontally scrollable
              rail — wrapped chips raggedly into 3 rows and ate the fold */}
          <div className="scroll-fade mt-4 -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {catOptions().map(([id, label]) => (
              <button
                key={id || "all"}
                type="button"
                onClick={() => setCat(id)}
                className={
                  cat === id
                    ? "chip shrink-0 cursor-pointer bg-primary text-white"
                    : "chip shrink-0 cursor-pointer border border-line-strong bg-white text-ink2 transition-colors hover:border-primary hover:text-primary"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {catalogLoading ? (
            <div className="mt-6">
              <CatalogLoadingCard bare />
            </div>
          ) : catalogError ? (
            <div className="mt-6">
              <CatalogErrorCard bare />
            </div>
          ) : catalogEmpty ? (
            /* the fetch SUCCEEDED and the catalog really has zero products:
               saying "no gadgets match your filters" here would blame the
               user for a filter they never set */
            <div className="mt-6">
              <CatalogErrorCard bare variant="empty" />
            </div>
          ) : (
            <>
              {// keyed on the real controls so a result change replays the entrance — by
// identity, not count (swapping a feature used to skip the replay), and minus
// the search box so typing doesn't re-animate per keystroke}
              <div
                key={`${cat}|${sort}|${[...feats].sort().join(",")}|${[...brands].sort().join(",")}|${minPrice}|${maxPrice}`}
                className="stagger mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {results.map((g, i) => (
                  <GadgetCard key={g.id} i={i} g={g} compare={compare} onCompare={onCompare} />
                ))}
              </div>

              {results.length === 0 && (
                scope.length === 0 ? (
                  /* the scope itself has no products (empty catalog, or a
                     category the marketplace returned nothing for). Saying
                     "no gadgets match your filters" would blame the user for
                     filters they never set. */
                  <div className="card mt-6 p-8 text-center">
                    <div className="text-lg font-semibold text-ink">There are no gadgets in this category yet</div>
                    <p className="mt-2 text-sm text-ink2">
                      {cat
                        ? "The catalog loaded, but this category has no products right now."
                        : "The catalog loaded, but it has no products right now."}
                    </p>
                    <Link to="/gadgets" className={btnPrimaryCls + " mt-4 inline-flex"}>
                      Browse all gadgets
                    </Link>
                  </div>
                ) : (
                  <div className="card mt-6 p-8 text-center">
                    <div className="text-lg font-semibold text-ink">No gadgets match your filters</div>
                    <p className="mt-2 text-sm text-ink2">Try clearing a filter or broadening the price range.</p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
