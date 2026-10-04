import { Link } from "react-router-dom";
import { GW, money, ownIndex, frontier, recommend } from "../lib.js";
import { Img, Oidx, Stars, displayName } from "../components/ui.jsx";


function HeroShowcase() {
  const g = GW.getGadget("apple-macbook-air-m1");
  return (
    <Link to={`/g/${g.id}`} className="card block overflow-hidden !rounded-lg text-ink" aria-label={`View the ${g.brand} ${g.model} detail page`}>
      <Img gadget={g} frame="3 / 2" eager />
      <div className="space-y-3 border-t border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{g.brand}</div>
            <div className="text-lg font-semibold">{g.model}</div>
            <div className="mono mt-1 text-[2.1rem] font-semibold text-ink">{money(g.price)}</div>
            <div className="text-xs text-ink3">≈ {money(GW.monthlyCost(g))}/month · 36-month window</div>
          </div>
          <Oidx g={g} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip-tag">Long battery</span>
          <span className="chip-good">Best value in Laptops</span>
          <span className="chip-bad">Premium price</span>
        </div>
      </div>
    </Link>
  );
}

function Scatter() {
  const list = GW.gadgets;
  const front = frontier(list);
  const pMax = Math.max(...list.map((g) => g.price)) * 1.05;
  const sMin = Math.min(...list.map(ownIndex)) - 4;
  const sMax = Math.max(...list.map(ownIndex)) + 4;
  const W = 760, H = 340, L = 52, R = 16, T = 16, B = 44;
  const px = (p) => L + (p / pMax) * (W - L - R);
  const py = (s) => T + (1 - (s - sMin) / (sMax - sMin)) * (H - T - B);
  const ticks = [];
  for (let t = 0; t <= pMax; t += 10000) ticks.push(t);
  const yTicks = [];
  for (let s = Math.ceil(sMin / 10) * 10; s <= sMax; s += 10) yTicks.push(s);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Scatter plot of gadget price against Performance to Cost index">
      {yTicks.map((s) => (
        <g key={s}>
          <line x1={L} y1={py(s)} x2={W - R} y2={py(s)} stroke="#E3E7ED" />
          <text x={L - 8} y={py(s) + 4} textAnchor="end" fontSize="11" fill="#64748B" fontFamily="Spline Sans Mono, monospace">
            {s}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={px(t)} y1={T} x2={px(t)} y2={H - B} stroke="#E3E7ED" />
          <text x={px(t)} y={H - B + 20} textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="Spline Sans Mono, monospace">
            ₱{t / 1000}k
          </text>
        </g>
      ))}
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#CDD4DE" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="#CDD4DE" />
      <text x={L} y={T + 2} fontSize="11" fill="#64748B">Performance to Cost ↑</text>
      <text x={W - R} y={H - B - 6} textAnchor="end" fontSize="11" fill="#64748B">Price →</text>
      {list.map((g) => {
        const on = front.has(g.id);
        return (
          <Link key={g.id} to={`/g/${g.id}`}>
            <circle cx={px(g.price)} cy={py(ownIndex(g))} r={on ? 8 : 6.5}
              fill={on ? "#9A5B10" : "#1D5BA4"} fillOpacity=".9" stroke="#fff" strokeWidth="1.5"
              style={{ cursor: "pointer" }}>
              <title>{`${g.brand} ${g.model} — ${money(g.price)} · Index ${ownIndex(g)}${on ? " · on best-value frontier" : ""}`}</title>
            </circle>
          </Link>
        );
      })}
    </svg>
  );
}

const MISS = [
  { h: "Cost per month beats sticker price", p: "Spread price over a fixed 36-month window and a ₱47,000 laptop can be cheaper to own than a ₱25,000 one that dies in two years. Every price on GadgetWise shows the monthly estimate." },
  { h: "Battery is a school-day spec", p: "Manufacturer battery claims assume light use. A device that lasts one full class day away from outlets changes how you carry your bag — that is worth more than a benchmark point." },
  { h: "Warranty is part of the price", p: "Repair costs after a year of student life are real. Warranty length and repairability are scored openly here, not buried in the fine print." },
];

function Home({ compare, onCompare }) {
  const cheapest = [...GW.gadgets].sort((a, b) => GW.monthlyCost(a) - GW.monthlyCost(b)).slice(0, 5);
  return (
    <>
      {/* Hero */}
      <section className="border-t border-gold-hair bg-hero text-on-hero">
        <div className="mx-auto grid max-w-[1904px] items-center gap-10 px-6 lg:px-12 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-12">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-hair">Student-first gadget guide</div>
            <h1 className="mt-3">
              Buy the gadget that costs less to own — not just less to buy.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-on-hero2">
              GadgetWise ranks real gadgets by budget fit, academic use, and what they cost per month over
              36 months. Every point in the score is accounted for — no black-box rankings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/gadgets" className="btn-hero">Browse gadgets</Link>
              <Link to="/recommend" className="btn-hero-ghost">Find my recommendation</Link>
            </div>
            <ul className="mt-6 max-w-2xl list-disc space-y-2.5 pl-5 text-lg text-on-hero2 marker:text-gold-hair">
              <li>Transparent 100-point scoring — see exactly why a gadget ranks where it does</li>
              <li>Performance to Cost index on every product</li>
              <li>Reviews written by students, for students</li>
            </ul>
          </div>
          <HeroShowcase />
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1904px] grid-cols-2 gap-6 px-6 lg:px-12 pt-12 pb-10 sm:grid-cols-4 sm:divide-x sm:divide-line lg:pt-24">
          {[
            ["Gadgets tracked", GW.community.gadgetsTracked],
            ["Student reviews", GW.community.reviewsWritten.toLocaleString()],
            ["Issues reported", GW.community.issuesReported],
            ["Average rating", `${GW.community.avgRating}★`],
          ].map(([label, v]) => (
            <div key={label} className="sm:pl-6 sm:first:pl-0">
              <div className="mono text-3xl font-semibold text-primary-dark">{v}</div>
              <div className="text-sm text-ink3">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="section">
        <div className="eyebrow">Browse by category</div>
        <h2 className="mt-2 text-2xl font-bold">Every category, scored the same way</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GW.categories.map((c) => (
            <Link key={c.id} to={`/gadgets?cat=${c.id}`} className="card block p-5 transition-colors hover:border-primary">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="mono text-sm text-ink3">{GW.gadgetsInCategory(c.id).length} tracked</span>
              </div>
              <p className="mt-2 text-sm text-ink2">{c.blurb}</p>
              <div className="mt-3 text-sm font-semibold text-primary">View gadgets →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial */}
      <section className="section pt-0">
        <div className="eyebrow">What students usually miss</div>
        <h2 className="mt-2 text-2xl font-bold">Three things worth more than a spec sheet</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {MISS.map((m) => (
            <div key={m.h} className="border-l-2 border-warm pl-4">
              <h3 className="font-semibold">{m.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{m.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cheapest to own */}
      <section className="section pt-0">
        <div className="border-t border-line pt-10">
          <div className="eyebrow">Cheapest to own</div>
          <h2 className="mt-2 text-2xl font-bold text-balance">Lowest monthly cost across the catalog</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink2 text-pretty">
            Ranked by estimated monthly cost over a 36-month window. The Performance to Cost index
            (0&ndash;100, higher is better) shows what the price actually buys.
          </p>
          <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
            <div>
              {/* column labels — stated once, not repeated per row */}
              <div className="hidden grid-cols-[2.75rem_5.5rem_minmax(0,1fr)_9.5rem_11.5rem_5.25rem] gap-x-5 border-b border-l-[3px] border-l-transparent border-line px-5 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink3 lg:grid">
                <span>Rank</span>
                <span aria-hidden="true">&nbsp;</span>
                <span>Product</span>
                <span>Student rating</span>
                <span className="text-right">Est. monthly</span>
                <span className="text-right">Score</span>
              </div>
              <ol className="mt-4 space-y-3 lg:mt-3">
                {cheapest.map((g, i) => (
                  <li key={g.id}>
                    <Link
                      to={`/g/${g.id}`}
                      aria-label={`${displayName(g)} — ${money(GW.monthlyCost(g))} per month, ${money(g.price)} upfront, Performance to Cost ${ownIndex(g)} of 100`}
                      className={`group grid grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-5 py-4 transition-colors hover:border-primary hover:bg-primary-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:grid-cols-[2.75rem_5.5rem_minmax(0,1fr)_9.5rem_11.5rem_5.25rem] lg:items-center lg:gap-x-5 ${i === 0 ? "border-l-[3px] border-l-warm" : ""}`}
                    >
                      <span className={`mono row-start-1 text-lg font-semibold leading-none transition-colors ${i === 0 ? "text-warm" : "text-ink3 group-hover:text-primary"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Img gadget={g} className="row-start-1 h-14 w-14 shrink-0 sm:h-16 sm:w-20 lg:h-[4.125rem] lg:w-[5.5rem]" imgClass="p-1" />
                      <div className="row-start-1 col-start-3 min-w-0 lg:col-start-3">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-base font-semibold leading-snug text-ink transition-colors group-hover:text-primary lg:text-lg">{displayName(g)}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink3">
                          <span>{GW.getCategory(g.category).name}</span>
                          <span className="whitespace-nowrap"><span className="mono tabular-nums">{money(g.price)}</span> upfront</span>
                        </div>
                      </div>
                      <div className="col-start-3 row-start-2 lg:col-start-4 lg:row-start-1">
                        <Stars rating={g.rating} count={g.reviewCount} />
                      </div>
                      <div className="col-start-3 row-start-3 lg:col-start-5 lg:row-start-1 lg:text-right">
                        <span className="mono inline-flex flex-wrap items-baseline text-2xl font-semibold tabular-nums text-primary-dark">
                          {money(GW.monthlyCost(g))}<span className="text-sm font-medium text-ink3">/mo</span>
                        </span>
                      </div>
                      <Oidx g={g} compact className="col-start-3 row-start-4 justify-self-start lg:col-start-6 lg:row-start-1 lg:justify-self-end" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            {/* Score explainer — what the number means, at the point of confusion */}
            <aside className="card mt-8 flex flex-col p-6 lg:mt-0 lg:self-stretch lg:justify-between">
              <div className="eyebrow">How it&rsquo;s scored</div>
              <h3 className="mt-2 text-lg font-semibold">What the Performance to Cost index measures</h3>
              <p className="mt-2 text-sm text-ink2 text-pretty">
                Every gadget earns up to 100 points from four factors. Higher is better &mdash;
                the full breakdown sits on each detail page.
              </p>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-ink3">Weight of each factor</div>
              <div className="mt-3 space-y-3.5">
                {[
                  ["Value vs category median", 30],
                  ["Battery for a school day", 25],
                  ["Student rating", 25],
                  ["Warranty & repairability", 20],
                ].map(([label, pts]) => (
                  <div key={label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-ink2">{label}</span>
                      <span className="tabular-nums text-ink3"><span className="mono font-semibold text-ink">{pts}</span> pts</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(pts / 30) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5 text-sm">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="tabular-nums text-ink3"><span className="mono font-semibold text-ink">100</span> pts</span>
                </div>
              </div>
              <p className="mt-auto border-t border-line pt-4 text-sm text-ink2 text-pretty">
                This list ranks by cost to own. The index tells you what the price buys beyond the
                sticker &mdash; so a slightly pricier pick can still be the smarter one.
              </p>
            </aside>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink2">
            <span>Showing the 5 cheapest of {GW.gadgets.length} tracked gadgets.</span>
            <Link to="/gadgets" className="font-semibold text-primary hover:text-primary-dark">Browse the full catalog &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Scatter */}
      <section className="section pt-0">
        <div className="border-t border-line pt-10">
          <div className="eyebrow">The best-value map</div>
          <h2 className="mt-2 text-2xl font-bold">Price vs Performance to Cost</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink2">
            Amber dots sit on the best-value frontier: no other gadget is both cheaper and better indexed.
            Click any dot to open its detail page.
          </p>
          <div className="card mt-6 p-6"><Scatter /></div>
        </div>
      </section>

      {/* Flow band */}
      <section className="bg-hero text-on-hero">
        <div className="mx-auto max-w-[1904px] px-6 lg:px-12 py-12">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-hair">How the ranking works</div>
          <h2 className="mt-2 text-2xl font-bold">100 points, fully accounted for</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["20", "Budget Fit", "How comfortably the price sits inside your budget band."],
              ["25", "Academic Suitability", "Matched against what your use case actually demands."],
              ["50", "Your Priorities", "Performance, battery, cost per month — weight what matters to you."],
              ["5", "Community Rating", "What students who own it say, normalized to 0–5."],
            ].map(([pts, h, p]) => (
              <div key={h}>
                <div className="mono text-3xl font-semibold text-gold-hair">{pts}</div>
                <h3 className="mt-2 font-semibold">{h}</h3>
                <p className="mt-1 text-sm text-on-hero2">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="card flex flex-col items-start gap-4 border-l-4 border-l-warm p-8 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Not sure where to start?</h2>
            <p className="mt-1 text-ink2">Answer five short questions and get a ranked shortlist with the full score breakdown.</p>
          </div>
          <Link to="/recommend" className="btn-primary sm:whitespace-nowrap">Find my recommendation</Link>
        </div>
      </section>
    </>
  );
}


export default Home;
