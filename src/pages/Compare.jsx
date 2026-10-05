// Compare — /compare · "Compare Gadgets"
// Frame-matched comparison table: one column per gadget, winner cells get a
// soft badge only when the row's spread is at least 8% (near-ties stay quiet).
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GW, money } from "../lib.js";
import { Img, useWishlist, btnPrimaryCls } from "../components/ui.jsx";

const THRESHOLD = 0.08;

const ROWS = [
  { label: "Price", better: "low", badge: "Lower price", num: (g) => g.price, val: (g) => money(g.price) },
  {
    label: "Rating", better: "high", badge: "Higher rating", num: (g) => g.rating,
    val: (g) => (
      <>
        {g.rating.toFixed(1)} ★ <span className="text-[11px] text-ink2">({g.reviewCount})</span>
      </>
    ),
  },
  {
    label: "Cost per month", better: "low", badge: "Cheaper per month",
    num: (g) => GW.monthlyCost(g), val: (g) => `≈ ${money(GW.monthlyCost(g))}/mo`,
  },
  { label: "Warranty", better: null, badge: null, num: null, val: (g) => `${g.value.warrantyYears} yr` },
  {
    label: "Performance", better: "high", badge: "Faster",
    num: (g) => g.scored.performance, val: (g) => `${g.scored.performance.toFixed(1)}/10`,
  },
  {
    label: "Battery", better: "high", badge: "Better battery",
    num: (g) => g.scored.battery, val: (g) => `${g.scored.battery.toFixed(1)}/10`,
  },
  {
    label: "Portability", better: "high", badge: "More portable",
    num: (g) => g.scored.portability, val: (g) => `${g.scored.portability.toFixed(1)}/10`,
  },
  {
    label: "Display", better: "high", badge: "Better display",
    num: (g) => g.scored.display, val: (g) => `${g.scored.display.toFixed(1)}/10`,
  },
  { label: "Repair path", better: null, badge: null, num: null, val: (g) => g.value.repairabilityLabel },
];

// Index of the winning gadget for a row, or -1 when there is no ≥8% spread.
function winnerIndex(row, list) {
  if (!row.num || list.length < 2) return -1;
  const nums = list.map(row.num);
  const best = row.better === "low" ? Math.min(...nums) : Math.max(...nums);
  const worst = row.better === "low" ? Math.max(...nums) : Math.min(...nums);
  if (!best || Math.abs(worst - best) / Math.abs(best) < THRESHOLD) return -1;
  return nums.indexOf(best);
}

const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary";

export default function Compare({ compare = new Set(), onCompare = () => {} }) {
  const [searchParams] = useSearchParams();
  const [hidden, setHidden] = useState(new Set());
  const wish = useWishlist();

  // ponytail: 'ids' query param seeds selection (App state can't be set from here)
  const seedIds = (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ids = [...new Set([...compare, ...seedIds])].filter((id) => !hidden.has(id));
  const list = GW.gadgetsByIds(ids);

  const remove = (id) => {
    if (compare.has(id)) onCompare(id);
    else setHidden((h) => new Set(h).add(id));
  };

  return (
    <main className="mx-auto w-full max-w-none px-6 pb-24 pt-10">
      <h1 className="text-[32px] font-extrabold leading-tight">Compare Gadgets</h1>
      <p className="mt-2 max-w-[640px] text-ink2">
        Two to four gadgets side by side. Meaningful differences are highlighted — near-ties stay quiet, so the table
        tells you what actually matters.
      </p>

      {list.length < 2 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-ink2">Nothing to compare yet.</p>
          <Link to="/gadgets" className={`${btnPrimaryCls} mt-5 inline-flex`}>
            Browse gadgets
          </Link>
        </div>
      ) : (
        <>
          <div className="card mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line align-bottom">
                  <th className="w-[150px] px-5 pb-4 text-left align-bottom text-xs font-semibold text-ink2">
                    Compare {list.length} gadgets
                  </th>
                  {list.map((g) => (
                    <th key={g.id} className="min-w-[190px] px-5 pb-4 text-left align-bottom font-normal">
                      <Img gadget={g} className="rounded-lg" frame="4 / 3" />
                      <div className="mt-3 text-xs font-normal text-ink2">{g.brand}</div>
                      <Link to={`/g/${g.id}`} className="mt-0.5 block text-base font-bold text-primary hover:underline">
                        {g.model}
                      </Link>
                      <div className="mt-1 text-xs font-normal text-ink2">
                        {GW.getCategory(g.category).name} · {g.rating.toFixed(1)}★ ({g.reviewCount})
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => wish.toggle(g.id)} className={ghostBtnCls}>
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M8 13.5S2 10 2 5.9C2 3.7 3.7 2.5 5.3 2.5c1 0 2 .5 2.7 1.4.7-.9 1.7-1.4 2.7-1.4 1.6 0 3.3 1.2 3.3 3.4 0 4.1-6 7.6-6 7.6Z" />
                          </svg>
                          Wishlist
                        </button>
                        <button type="button" onClick={() => remove(g.id)} className={ghostBtnCls}>
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 4l8 8M12 4l-8 8" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-4 text-left text-sm font-semibold text-ink">
                      {row.label}
                    </th>
                    {list.map((g, gi) => {
                      const win = gi === winnerIndex(row, list);
                      return (
                        <td
                          key={g.id}
                          className={`px-5 py-4 align-middle ${win ? "border-l-[3px] border-primary bg-primary-soft" : ""}`}
                        >
                          <span className={`mono ${win ? "font-bold text-primary-dark" : "text-ink"}`}>{row.val(g)}</span>
                          {win && (
                            <span className="chip-blue ml-2 rounded-full px-2.5 py-1 text-[11px]">
                              <span aria-hidden="true">↗ </span>
                              {row.badge}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* At a glance */}
          {(() => {
            const lowestPrice = [...list].sort((a, b) => a.price - b.price)[0];
            const cheapest = [...list].sort((a, b) => GW.monthlyCost(a) - GW.monthlyCost(b))[0];
            const highestRated = [...list].sort((a, b) => b.rating - a.rating)[0];
            const mostReviewed = [...list].sort((a, b) => b.reviewCount - a.reviewCount)[0];
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
                        Lowest price: <strong>{lowestPrice.brand} {lowestPrice.model}</strong> at {money(lowestPrice.price)}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      {check}
                      <span>
                        Cheapest long-term: <strong>{cheapest.brand} {cheapest.model}</strong> at ≈ {money(GW.monthlyCost(cheapest))}/month
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      {check}
                      <span>
                        Highest rated: <strong>{highestRated.brand} {highestRated.model}</strong> at {highestRated.rating.toFixed(1)}★
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-ink2">
                    Students rate <strong>{mostReviewed.brand} {mostReviewed.model}</strong> highest ({mostReviewed.rating.toFixed(1)}★).
                    All monthly costs use the same fixed 36-month window, so the comparison stays apples-to-apples.
                  </p>
                </div>
                <p className="mt-4 text-sm text-ink2">
                  Highlighted cells mark a difference of at least 8% — near-ties stay unmarked. Monthly cost uses a fixed
                  36-month window.
                </p>
              </>
            );
          })()}
        </>
      )}
    </main>
  );
}
