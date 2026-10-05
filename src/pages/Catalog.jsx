import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW } from "../lib.js";
import { GadgetCard } from "../components/ui.jsx";

/* Filter behavior ported 1:1 from the prototype (js/catalog.js FEATURES/apply). */
const FEATURES = {
  long: (g) => /([8-9]\d*|\d{2,})\s*(h|hr|hour)/i.test(g.specs.Battery || ""),
  budget: (g) => g.price < 15000,
  durable: (g) => typeof g.scored.durability === "number" && g.scored.durability >= 7,
};
const FEATURE_LABELS = [
  ["long", "Long battery (8h+)"],
  ["budget", "Under ₱15,000"],
  ["durable", "Build & protection (7+)"],
];
const CATS = [
  ["", "All"],
  ["smartphones", "Smartphones"],
  ["laptops", "Laptops"],
  ["tablets", "Tablets"],
  ["headphones", "Headphones"],
  ["powerbanks", "Power banks"],
  ["smartwatches", "Smartwatches"],
];
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

export default function Catalog({ compare, onCompare }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat") || "";
  const spQ = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const [q, setQ] = useState(spQ);
  const [sort, setSort] = useState("featured");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("100000");
  const [feats, setFeats] = useState(() => new Set());
  const [brands, setBrands] = useState(() => new Set());

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
    setMaxPrice("100000");
    setFeats(new Set());
    setBrands(new Set());
    setCat("");
  };

  const scope = cat ? GW.gadgetsInCategory(cat) : GW.gadgets;
  const brandList = [...new Set(scope.map((g) => g.brand))].sort();

  const min = minPrice === "" ? null : +minPrice;
  const max = maxPrice === "" ? null : +maxPrice;
  const results = (() => {
    let list = scope.slice();
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((g) =>
        `${g.brand} ${g.model} ${g.summary} ${GW.getCategory(g.category).name} ${g.tagline}`.toLowerCase().includes(s)
      );
    }
    if (brands.size) list = list.filter((g) => brands.has(g.brand));
    if (min != null && min > 0) list = list.filter((g) => g.price >= min);
    if (max != null && max < 100000) list = list.filter((g) => g.price <= max);
    for (const [key, fn] of Object.entries(FEATURES)) if (feats.has(key)) list = list.filter(fn);
    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "monthly": list.sort((a, b) => GW.monthlyCost(a) - GW.monthlyCost(b)); break;
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

  return (
    <section className="section">
      <div className="mb-8">
        <h1>Browse Gadgets</h1>
        <p className="mt-3 text-ink2">
          Search, filter and sort the catalog. Tick “Compare” on a card to add it to the compare tray below.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="min-w-0" aria-label="Filters">
          <div className="card p-5">
            <div>
              <h4 className={headCls}>CATEGORY</h4>
              <div>
                {CATS.map(([id, label]) => (
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
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full min-w-0 rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                />
              </div>
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
              <div>
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
              <button type="button" onClick={clearAll} className="btn btn-ghost w-full px-3 py-2 text-sm">
                Clear all filters
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-primary-soft p-5">
            <h4 className="mb-1.5 text-base font-bold text-ink">Can't decide?</h4>
            <p className="mb-3 text-sm text-ink2">Get a ranked shortlist for your budget and course load.</p>
            <Link to="/recommend" className="btn btn-primary px-4 py-2 text-sm">
              Get recommendations →
            </Link>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0">
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
                aria-label="Search gadgets"
                className="field rounded-lg py-2.5 pl-10 pr-4"
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <label htmlFor="catalog-sort" className="text-sm text-ink3">
                Sort
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-ink"
              >
                {SORTS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-3 text-sm text-ink3">{meta}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATS.map(([id, label]) => (
              <button
                key={id || "all"}
                type="button"
                onClick={() => setCat(id)}
                className={
                  cat === id
                    ? "chip cursor-pointer bg-primary text-white"
                    : "chip cursor-pointer border border-line-strong bg-white text-ink2 transition-colors hover:border-primary hover:text-primary"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((g) => (
              <GadgetCard key={g.id} g={g} compare={compare} onCompare={onCompare} />
            ))}
          </div>

          {results.length === 0 && (
            <div className="card mt-6 p-8 text-center">
              <div className="text-lg font-semibold text-ink">No gadgets match your filters</div>
              <p className="mt-2 text-sm text-ink2">Try clearing a filter or broadening the price range.</p>
            </div>
          )}

          {/* Compare tray */}
          {compare.size > 0 && (
            <div className="card mt-8 flex flex-wrap items-center gap-3 p-4">
              <span className="mono font-semibold text-primary-dark">{compare.size}/4</span>
              <span className="text-ink2">in compare</span>
              {[...compare].map((id) => {
                const g = GW.gadgets.find((x) => x.id === id);
                return g ? (
                  <span key={id} className="chip chip-neutral gap-1.5">
                    {GW.displayName(g)}
                    <button
                      type="button"
                      onClick={() => onCompare(id)}
                      aria-label={`Remove ${GW.displayName(g)} from compare`}
                      className="text-ink3 hover:text-ink"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => [...compare].forEach((id) => onCompare(id))}
                  className="btn btn-ghost px-3 py-2 text-sm"
                >
                  Clear
                </button>
                <Link to="/compare" className="btn btn-primary px-3 py-2 text-sm">
                  Open compare →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
