// Compare — /compare · "Compare Gadgets"
// Ported from the prototype's js/comparison.js: a row model with a per-row
// "better" direction (low/high/null), winner highlighting only when the gap
// is meaningful (>=8% relative spread, so near-ties stay quiet), category-
// aware extra rows, and a comparison-history strip.
// Live marketplace listings lack most curated fields (warranty, scored
// sub-scores, repair path), so a missing value renders as "Not available"
// and never wins a row.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW, money, ownIndex } from "../lib.js";
import { Img, useWishlist, useToast, btnPrimaryCls } from "../components/ui.jsx";
import { readCompareHistory } from "./ComparisonHistory.jsx";
import { resolveSelection } from "../lib/compare-selection.js";

const THRESHOLD = 0.08;
const HISTORY_KEY = "gw_compare_history";
const SELECT_KEY = "gw_compare_selection";
const NA = "Not available";

/* Category-relevant spec rows. Shown only when the comparison stays inside
   one category AND every listing actually carries that spec. */
const SPEC_ROWS = {
  smartphones: ["Display", "Processor", "RAM", "Storage", "Battery", "Rear camera", "OS"],
  laptops: ["Processor", "RAM", "Storage", "Battery", "Weight", "Ports", "OS"],
  tablets: ["Display", "Processor", "RAM", "Storage", "Battery", "Stylus", "OS"],
  headphones: ["Type", "Noise canceling", "Battery", "Codecs", "Weight"],
  powerbanks: ["Capacity", "Output", "Ports", "Recharge time", "Weight"],
  smartwatches: ["Display", "Battery", "GPS", "Water resistance", "Calls", "Weight"],
};

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const score = (v) => (v == null ? NA : `${v.toFixed(1)}/10`);

// A rating of 0 (or none) means unrated — no winner, no fake 0.0 stars.
const hasRating = (g) => num(g?.rating) != null && g.rating > 0;
const ratingText = (g) => (hasRating(g) ? `${g.rating.toFixed(1)}★ (${g.reviewCount})` : "Not available");

// A ?ids= link owns the selection, otherwise the tray, otherwise whatever
// was picked last. The rules live in lib/compare-selection.js.
function normalizeIds(raw) {
  return [...new Set(String(raw || "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 4);
}

function readSavedIds() {
  try {
    const raw = localStorage.getItem(SELECT_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? normalizeIds(v.join(",")) : [];
  } catch {
    return [];
  }
}
function writeSavedIds(ids) {
  try {
    localStorage.setItem(SELECT_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota: the selection just does not survive a refresh */
  }
}

// better: "low" | "high" | null (null = informational row)
function rowsFor(gadgets) {
  const cats = new Set(gadgets.map((g) => g.category));
  const multiCategory = cats.size > 1;
  const rows = [];
  const add = (label, better, badge, get, val) => rows.push({ label, better, badge, get, val });

  add("Price", "low", "Lower price", (g) => (g.price > 0 ? g.price : null), (g) =>
    g.price > 0 ? money(g.price) : NA);
  // Plain strings keep the row model pure (no JSX) so it stays unit-testable.
  add("Rating", "high", "Higher rating", (g) => (hasRating(g) ? g.rating : null), (g) =>
    hasRating(g) ? `${g.rating.toFixed(2)} ★ (${g.reviewCount})` : NA);
  add("Cost per month", "low", "Cheaper per month", (g) => (g.price > 0 ? num(GW.monthlyCost(g)) : null),
    (g) => (g.price > 0 ? `≈ ${money(GW.monthlyCost(g))}/month` : NA));
  add("Warranty", "high", "Longer warranty", (g) => num(g.value?.warrantyYears), (g) => {
    const w = g.value?.warrantyYears;
    return w == null ? NA : `${w} ${w === 1 ? "yr" : "yrs"}`;
  });
  add("Performance", "high", "Faster", (g) => num(g.scored?.performance), (g) => score(g.scored?.performance));
  add("Battery", "high", "Better battery", (g) => num(g.scored?.battery), (g) => score(g.scored?.battery));
  if (multiCategory) {
    add("Portability", "high", "More portable", (g) => num(g.scored?.portability), (g) => score(g.scored?.portability));
    add("Display", "high", "Better display", (g) => num(g.scored?.display), (g) => score(g.scored?.display));
  }
  if (cats.size === 1) {
    (SPEC_ROWS[[...cats][0]] || []).forEach((k) => {
      if (gadgets.every((g) => g.specs?.[k] !== undefined)) {
        add(k, null, null, null, (g) => g.specs[k]);
      }
    });
  }
  // Repair path: the curated plain-language label when one exists
  // ("Hard — authorized service only"); a listing with no repair
  // assessment degrades to "Not available" like every other missing value.
  add("Repair path", null, null, null, (g) => {
    const label = g.value?.repairabilityLabel;
    return label && !/^not specified/i.test(label) ? label : NA;
  });
  return rows;
}

/* Indices of the cells that win this row. A row only highlights when every
   value is numeric, the spread is non-zero, and the gap is meaningful
   (>=8% relative) — near-ties stay quiet. Ties at the winning edge all
   get marked. */
function bestIndices(row, list) {
  if (!row.better || !row.get || list.length < 2) return [];
  const values = list.map(row.get);
  if (values.some((v) => v == null)) return [];
  if (!values.every((v) => typeof v === "number")) return [];
  const spread = Math.max(...values) - Math.min(...values);
  if (spread === 0) return [];
  const edge = row.better === "low" ? Math.min(...values) : Math.max(...values);
  const rel = values[0] !== 0 ? Math.abs(spread / Math.max(...values.map(Math.abs))) : 1;
  if (rel < THRESHOLD) return [];
  return values.map((v, i) => (v === edge ? i : -1)).filter((i) => i >= 0);
}

// Same key and shape the history page reads, so both pages share one list.
function recordHistory(gadgets) {
  if (gadgets.length < 2) return null;
  const ids = gadgets.map((g) => g.id);
  const key = [...ids].sort().join(",");
  const hist = readCompareHistory();
  const first = hist[0];
  if (first && [...(first.ids || [])].sort().join(",") === key) return null; // no dupes on refresh
  const titles = ids.map((id) => (GW.getGadget(id) ? GW.displayName(GW.getGadget(id)) : id));
  const next = [{ ids, titles, ts: Date.now() }, ...hist].slice(0, 20);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode: the strip just stays empty */
  }
  return next;
}

const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary";

export default function Compare({ compare = new Set(), onCompare = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState(readCompareHistory);
  const wish = useWishlist();
  const { toast, node: toastNode } = useToast();

  // The selection is authoritative here. A ?ids= link owns it; otherwise the
  // compare tray drives it; otherwise the last selection this browser made
  // survives a refresh (the tray itself is in-memory and dies on reload).
  const linkIds = normalizeIds(searchParams.get("ids"));
  const hasLinkParam = searchParams.has("ids");
  const trayIds = [...compare];
  const [picked, setPicked] = useState(() =>
    resolveSelection({ hasLinkParam, linkIds, trayIds, savedIds: readSavedIds() })
  );
  const linkKey = linkIds.join(",");
  const trayKey = trayIds.join(",");

  useEffect(() => {
    if (hasLinkParam) {
      setPicked((p) => (p.join(",") === linkKey ? p : linkIds));
      return;
    }
    if (trayKey) setPicked((p) => (p.join(",") === trayKey ? p : trayIds));
  }, [hasLinkParam, linkKey, trayKey]);

  // Remember the selection so a refresh (or a return visit) does not empty
  // the table. An empty selection is written too, so a cleared comparison
  // does not come back on the next visit.
  useEffect(() => {
    writeSavedIds(picked);
  }, [picked]);

  // One column per selected id. An id this browser cannot resolve stays
  // visible as a clear "could not load" slot instead of silently vanishing.
  const slots = picked.map((id) => ({ id, g: GW.getGadget(id) }));
  const list = slots.filter((s) => s.g).map((s) => s.g);
  const listKey = list.map((g) => g.id).join(",");
  // slot index -> index in the resolved list (-1 when the slot is unresolved),
  // so the row model's winner indices stay aligned with the columns.
  const slotListIdx = slots.map((s) => (s.g ? list.indexOf(s.g) : -1));
  const missing = slots.filter((s) => !s.g);

  // Record the comparison once it is real (prototype: recorded on render).
  useEffect(() => {
    if (list.length < 2) return;
    const next = recordHistory(list);
    if (next) setHistory(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const remove = (id) => {
    // Drop it from the authoritative selection. A ?ids= comparison lives in
    // the URL, so the link itself has to change — otherwise the id comes back
    // on the next click or refresh. Both are set from the SAME list, so the
    // URL and the selection can never disagree.
    const next = picked.filter((x) => x !== id);
    setPicked(next);
    if (hasLinkParam) {
      const params = new URLSearchParams(searchParams);
      params.set("ids", next.join(","));
      setSearchParams(params, { replace: true });
    }
    // Tray-driven item: drop it from the shared compare set too.
    if (compare.has(id)) onCompare(id);
  };

  const rows = rowsFor(list);

  return (
    <section className="mx-auto w-full max-w-none px-6 lg:px-12 2xl:px-16 pb-24 pt-10">
      <h1>Compare Gadgets</h1>
      <p className="mt-2 max-w-[640px] text-ink2">
        Two to four gadgets side by side. Meaningful differences are highlighted — near-ties stay quiet, so the table
        tells you what actually matters.
      </p>

      {picked.length < 2 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">
            {picked.length === 1 ? "Add one more gadget" : "No gadgets selected yet"}
          </p>
          <p className="mt-2 text-ink2">
            {picked.length === 1
              ? "Pick at least one more gadget from the catalog to compare side by side."
              : "Browse the catalog and use the Compare checkbox on product cards to select 2–4 gadgets."}
          </p>
          <Link to="/gadgets" className={`${btnPrimaryCls} mt-5 inline-flex`}>
            Browse gadgets
          </Link>
        </div>
      ) : (
        <>
          {missing.length > 0 && (
            <p role="status" className="mt-6 rounded-lg bg-[#FFF8E6] px-4 py-2.5 text-sm font-medium text-[#6B4E12]">
              {missing.length} of {picked.length} selected listings could not be loaded — the rest of the comparison is
              still live.
            </p>
          )}
          <div className="card mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line align-bottom">
                  <th className="sticky left-0 z-10 w-[150px] bg-surface px-5 pb-4 text-left align-bottom text-xs font-semibold text-ink2">
                    Compare {list.length} gadgets
                  </th>
                  {slots.map((slot) =>
                    slot.g ? (
                      <th key={slot.id} className="min-w-[190px] px-5 pb-4 text-left align-bottom font-normal">
                        <Img gadget={slot.g} className="rounded-lg" frame="4 / 3" />
                        <div className="mt-3 text-xs font-normal text-ink2">
                          {slot.g.brand && slot.g.brand !== "Unknown" && !slot.g.model.startsWith(slot.g.brand) ? slot.g.brand : ""}
                        </div>
                        <Link to={`/g/${slot.g.id}`} className="mt-0.5 block text-base font-bold text-primary hover:underline">
                          {slot.g.model}
                        </Link>
                        <div className="mt-1 text-xs font-normal text-ink2">
                          {GW.getCategory(slot.g.category).name} · {ratingText(slot.g)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={async () => {
                            const wasSaved = wish.has(slot.g.id);
                            const res = await wish.toggle(slot.g.id);
                            if (res && res.gated) return; // auth prompt shown; nothing changed
                            if (res && res.ok === false) toast("Saved on this device, but could not sync to your account.", "alert");
                            else toast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
                          }} className={ghostBtnCls}>
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M8 13.5S2 10 2 5.9C2 3.7 3.7 2.5 5.3 2.5c1 0 2 .5 2.7 1.4.7-.9 1.7-1.4 2.7-1.4 1.6 0 3.3 1.2 3.3 3.4 0 4.1-6 7.6-6 7.6Z" />
                            </svg>
                            {wish.has(slot.g.id) ? "Saved" : "Wishlist"}
                          </button>
                          <button type="button" onClick={() => remove(slot.id)} className={ghostBtnCls}>
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </th>
                    ) : (
                      // The id is in the selection but this browser cannot resolve
                      // it (delisted listing, stale link). Say so instead of
                      // dropping the column without a word.
                      <th key={slot.id} className="min-w-[190px] px-5 pb-4 text-left align-bottom font-normal">
                        <p className="text-sm font-semibold text-ink">Could not load</p>
                        <p className="mt-1 break-all text-xs font-normal text-ink3">{slot.id}</p>
                        <p className="mt-1 text-xs font-normal text-ink2">
                          This listing is no longer in the catalog. It may have been removed by the seller.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => remove(slot.id)} className={ghostBtnCls}>
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const best = bestIndices(row, list);
                  return (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-5 py-4 text-left text-sm font-semibold text-ink">
                        {row.label}
                      </th>
                      {slots.map((slot, gi) => {
                        if (!slot.g) {
                          // unresolved id: an empty cell, never a fake value
                          return (
                            <td key={slot.id} className="px-5 py-4 align-middle">
                              <span className="mono text-ink3">{NA}</span>
                            </td>
                          );
                        }
                        const win = slotListIdx[gi] >= 0 && best.includes(slotListIdx[gi]);
                        const shown = row.val(slot.g);
                        return (
                          <td
                            key={slot.id}
                            className={`px-5 py-4 align-middle ${win ? "border-l-[3px] border-primary bg-primary-soft" : ""}`}
                          >
                            <span className={`mono ${win ? "font-bold text-primary-dark" : shown === NA ? "text-ink3" : "text-ink"}`}>
                              {shown}
                            </span>
                            {win && (
                              <span className="chip-blue ml-2 rounded-full px-2.5 py-1 text-xs">
                                <span aria-hidden="true">↗ </span>
                                {row.badge}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comparison history strip */}
          {history.length > 0 && (
            <div className="card mt-6 flex flex-wrap items-center gap-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink3">Recent comparisons</span>
              {history.slice(0, 5).map((h, i) => (
                <Link
                  key={`${h.ts}-${i}`}
                  to={`/compare?ids=${(h.ids || []).join(",")}`}
                  className="chip-neutral max-w-[280px] truncate transition-colors hover:border-primary hover:text-primary"
                >
                  {(h.titles && h.titles.length ? h.titles : h.ids || []).join(" vs ")}
                </Link>
              ))}
              <Link to="/compare-history" className="ml-auto text-xs font-semibold text-primary hover:underline">
                All history →
              </Link>
            </div>
          )}

          {/* At a glance */}
          {(() => {
            if (!list.length) return null;
            // A listing with no known price is not "cheapest" — its price is
            // unknown, so it never wins a price comparison.
            const priced = list.filter((g) => typeof g.price === "number" && g.price > 0);
            const lowestPrice = [...priced].sort((a, b) => a.price - b.price)[0] || null;
            const cheapest = [...priced].sort((a, b) => GW.monthlyCost(a) - GW.monthlyCost(b))[0] || null;
            // A product with no marketplace rating is not "rated 0.0" — it is
            // unrated, so it never wins a rating comparison.
            const rated = list.filter(hasRating).sort((a, b) => b.rating - a.rating);
            const highestRated = rated[0] || null;
            // Spread-aware verdict: near-ties on the Performance to Cost score read differently
            // A listing with unknown inputs can score NaN; treat it as unknown
            // (no score) so it never claims to be a winner.
            const scored = list.map((g) => ({ g, s: ownIndex(g) })).filter((x) => Number.isFinite(x.s));
            const ranked = scored.sort((a, b) => b.s - a.s).map((x) => x.g);
            const topScore = ranked.length ? ownIndex(ranked[0]) : null;
            const spread = ranked.length > 1 ? topScore - ownIndex(ranked[ranked.length - 1]) : 0;
            // The Performance to Cost index is a VALUE score (battery + rating +
            // price vs category + warranty), so its winner is a value winner —
            // it is not the highest rated product.
            const line =
              !ranked.length
                ? "No listing here has enough known data to score. Prices and ratings from the marketplace are what this comparison can use."
                : spread <= 4
                ? `These are very close (Performance to Cost ${topScore} vs ${ownIndex(ranked[ranked.length - 1])}). ` +
                  (cheapest
                    ? `${GW.displayName(cheapest)} still costs the least per month (≈ ${money(GW.monthlyCost(cheapest))}/mo), `
                    : "No listing here has a known price yet, so the monthly costs cannot be compared. ") +
                  `so the trade-offs above should decide it, not the totals.`
                : `${GW.displayName(ranked[0])} has the best Performance to Cost score (${topScore}/100). ` +
                  (highestRated
                    ? `Marketplace ratings put ${GW.displayName(highestRated)} highest (${highestRated.rating.toFixed(1)}★ from ${highestRated.reviewCount} marketplace reviews). `
                    : "None of these listings has a marketplace rating yet. ") +
                  `All monthly costs use the same fixed 36-month window, so the comparison stays apples-to-apples.`;
            const check = (
              <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m3 8.5 3 3 7-7" />
              </svg>
            );
            return (
              <>
                <div className="card mt-6 p-6">
                  <h2 className="text-lg font-extrabold">At a glance</h2>
                  <ul className="mt-4 grid gap-2.5">
                    <li className="flex items-start gap-2">
                      {check}
                      <span>
                        {lowestPrice ? (
                          <>
                            Lowest price: <strong>{GW.displayName(lowestPrice)}</strong> at {money(lowestPrice.price)}
                          </>
                        ) : (
                          <>Lowest price: <strong>Not available</strong> — no listing here has a known price</>
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      {check}
                      <span>
                        {cheapest ? (
                          <>
                            Cheapest long-term: <strong>{GW.displayName(cheapest)}</strong> at ≈ {money(GW.monthlyCost(cheapest))}/month
                          </>
                        ) : (
                          <>Cheapest long-term: <strong>Not available</strong> — no listing here has a known price</>
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      {check}
                      <span>
                        {highestRated ? (
                          <>
                            Highest marketplace rating: <strong>{GW.displayName(highestRated)}</strong> at {highestRated.rating.toFixed(1)}★
                          </>
                        ) : (
                          <>Highest marketplace rating: <strong>Not available</strong> — no listing here has a rating yet</>
                        )}
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-ink2">{line}</p>
                </div>
                <p className="mt-4 text-sm text-ink2">
                  Highlighted cells mark a difference of at least 8% — near-ties stay unmarked. Monthly cost uses a fixed
                  36-month window. Ratings and review counts come from the marketplace, not from GadgetWise users.
                </p>
              </>
            );
          })()}
        </>
      )}
      {toastNode}
    </section>
  );
}
