import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GW, money, ownIndexParts, frontier, recommend } from "../lib.js";
import { Img, Bar, Oidx, Stars, displayName } from "../components/ui.jsx";


const TABS = ["Overview", "Value & Ownership", "Reviews", "Issues"];

function GadgetDetail({ compare, onCompare }) {
  const { id } = useParams();
  const [tab, setTab] = useState(TABS[0]);
  const g = GW.getGadget(id);
  if (!g) {
    return (
      <section className="section">
        <h1>Gadget not found</h1>
        <Link to="/gadgets" className="btn-primary mt-4">Back to catalog</Link>
      </section>
    );
  }
  const monthly = GW.monthlyCost(g);
  const med = GW.categoryMedianMonthly(g.category);
  const parts = ownIndexParts(g);
  const isFront = frontier(GW.gadgets).has(g.id);
  const scored = [
    ["Performance", g.scored.performance],
    ["Battery", g.scored.battery],
    ["Portability", g.scored.portability],
    ["Display", g.scored.display],
    ["Camera", g.scored.camera],
    ["Storage", g.scored.storage],
  ];

  return (
    <section className="section">
      <nav className="text-sm text-ink3" aria-label="Breadcrumb">
        <Link to="/gadgets" className="hover:text-primary">Catalog</Link>
        {" / "}
        <Link to={`/gadgets?cat=${g.category}`} className="hover:text-primary">{GW.getCategory(g.category).name}</Link>
        {" / "}
        <span className="text-ink2">{g.model}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Img gadget={g} className="card" eager />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{g.brand}</div>
          <h1 className="mt-1">{g.model}</h1>
          <p className="mt-1 text-lg text-ink2">{g.tagline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <div className="mono text-2xl font-semibold text-primary-dark">{money(g.price)}</div>
              <div className="text-xs text-ink3">≈ {money(monthly)}/month · 36-month window</div>
            </div>
            <Oidx g={g} size="lg" />
            <Stars rating={g.rating} count={g.reviewCount} />
            {isFront && <span className="chip-tag">On the best-value frontier</span>}
          </div>
          <p className="mt-4 text-ink2">{g.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onCompare(g.id)}
              className={compare.has(g.id) ? "btn-primary" : "btn-ghost"}>
              {compare.has(g.id) ? "✓ In compare list" : "Add to compare"}
            </button>
            <Link to="/compare" className="btn-ghost">Open compare</Link>
            <Link to="/recommend" className="btn-ghost">Score it for my needs</Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 flex gap-1 overflow-x-auto border-b border-line md:justify-between md:gap-0" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap px-2.5 py-2.5 text-xs font-semibold sm:px-4 sm:text-sm md:flex-1 md:text-center md:text-base ${tab === t ? "border-b-2 border-primary text-primary-dark" : "text-ink3 hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {tab === "Overview" && (
          <>
            <div className="card p-6">
              <h2 className="font-semibold">Spec scores</h2>
              <p className="mt-1 text-sm text-ink3">Editorial 0–10 scores, comparable within category.</p>
              <div className="mt-4 space-y-3">
                {scored.map(([label, v]) => <Bar key={label} label={label} v={v} />)}
              </div>
            </div>
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="font-semibold">Key specs</h2>
                {/* specList is an array of plain strings in the dataset */}
                <ul className="mt-3 space-y-2 text-sm text-ink2">
                  {(g.specList || []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-ink3">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <h3 className="font-semibold text-success">Good for</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink2">
                    {g.goodFor.map((x) => <li key={x}>• {x}</li>)}
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="font-semibold text-danger">Not ideal for</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink2">
                    {g.notIdeal.map((x) => <li key={x}>• {x}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Value & Ownership" && (
          <>
            <div className="card p-6">
              <h2 className="font-semibold">Cost per month</h2>
              <p className="mt-1 text-sm text-ink3">
                One formula for every gadget: price ÷ 36 months. A fixed, documented assumption — not a
                per-product lifespan invention.
              </p>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="mono text-3xl font-semibold text-primary-dark">{money(monthly)}</span>
                <span className="text-ink3">per month</span>
              </div>
              <div className="mt-2 text-sm text-ink2">
                Category median: <span className="mono">{money(med)}</span>/month ·{" "}
                {monthly <= med ? (
                  <span className="font-semibold text-success">cheaper to own than the typical {GW.getCategory(g.category).name.toLowerCase().replace(/s$/, "")}</span>
                ) : (
                  <span className="font-semibold text-warm">above the category median</span>
                )}
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink3">Purchase price</span>
                  <span className="mono font-medium">{money(g.price)}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink3">Usage window</span>
                  <span className="mono font-medium">36 months</span>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink3">Warranty</span>
                  <span className="mono font-medium">{g.value.warrantyYears} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink3">Repairability</span>
                  <span className="font-medium">{g.value.repairabilityLabel}</span>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold">Performance to Cost index</h2>
              <p className="mt-1 text-sm text-ink3">
                Battery 25 + student rating 25 + value 30 (price vs category median) + warranty 20. Every
                input is defensible; nothing is hidden.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <Oidx g={g} size="lg" />
                <div className="flex-1 space-y-2">
                  {parts.map((p) => (
                    <div key={p.key}>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink2">{p.label} · {p.pts} pts</span>
                        <span className="mono font-semibold">{(p.v * p.pts).toFixed(0)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-warm" style={{ width: `${p.v * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Reviews" && (
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Student reviews</h2>
              <Stars rating={g.rating} count={g.reviewCount} />
            </div>
            <div className="mt-4 divide-y divide-line">
              {g.reviews.map((r) => (
                <div key={r.id} className="py-4">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">{r.user} <span className="font-normal text-ink3">· {r.context}</span></div>
                    <div className="text-sm text-ink3">{r.date}</div>
                  </div>
                  <div className="mt-1 text-star" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink2">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Issues" && (
          <div className="card border-l-4 border-l-warning p-6 lg:col-span-2">
            <h2 className="font-semibold">Known issues</h2>
            <p className="mt-3 text-ink2">{g.issue}</p>
            <p className="mt-4 text-sm text-ink3">
              Issues are community-reported and editorially reviewed. This is a static demo — reports are
              not collected.
            </p>
          </div>
        )}
      </div>

      {/* Related */}
      <div className="mt-12">
        <h2 className="text-xl font-bold">More in {GW.getCategory(g.category).name}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GW.gadgetsInCategory(g.category).filter((x) => x.id !== g.id).map((x) => (
            <Link key={x.id} to={`/g/${x.id}`} className="card flex items-center gap-3 p-4 hover:border-primary">
              <Img gadget={x} className="h-14 w-16 shrink-0 sm:w-20" imgClass="p-1" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold leading-snug">{displayName(x)}</div>
                <div className="mono truncate text-sm text-primary-dark">{money(x.price)}</div>
              </div>
              <Oidx g={x} className="max-w-[84px]" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


export default GadgetDetail;
