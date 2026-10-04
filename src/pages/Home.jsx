import { Link } from "react-router-dom";
import { GW, money, ownIndex, frontier, recommend } from "../lib.js";
import { Img, Oidx } from "../components/ui.jsx";


function MiniPareto() {
  // tiny scatter for the hero card — whole catalog so the plot fills; same frontier rule
  const list = GW.gadgets;
  const front = frontier(list);
  const pMax = Math.max(...list.map((g) => g.price)) * 1.08;
  const sMin = Math.min(...list.map(ownIndex)) - 4;
  const sMax = Math.max(...list.map(ownIndex)) + 4;
  const px = (p) => 20 + (p / pMax) * 280;
  const py = (s) => 138 - ((s - sMin) / (sMax - sMin)) * 118;
  return (
    <svg viewBox="0 0 320 158" className="w-full" role="img" aria-label="Laptop price vs Performance to Cost">
      <line x1="20" y1="138" x2="305" y2="138" stroke="#E3E7ED" />
      <line x1="20" y1="18" x2="20" y2="138" stroke="#E3E7ED" />
      {list.map((g) => {
        const on = front.has(g.id);
        return (
          <circle key={g.id} cx={px(g.price)} cy={py(ownIndex(g))} r={on ? 7 : 5}
            fill={on ? "#9A5B10" : "#1D5BA4"} fillOpacity=".9" stroke="#fff" strokeWidth="1.5">
            <title>{`${g.brand} ${g.model} — ${money(g.price)} · Index ${ownIndex(g)}${on ? " · best-value frontier" : ""}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function HeroShowcase() {
  const g = GW.getGadget("apple-macbook-air-m1");
  return (
    <Link to={`/g/${g.id}`} className="card block overflow-hidden !rounded-lg text-ink" aria-label={`View the ${g.brand} ${g.model} detail page`}>
      <Img gadget={g} className="bg-white" frame="3 / 2" eager />
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
        <MiniPareto />
        <div className="text-xs text-ink3">Amber dots sit on the best-value frontier — cheaper and better indexed than anything else.</div>
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
        <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
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
            <ul className="mt-7 space-y-3.5 text-lg text-on-hero2">
              <li>• Transparent 100-point scoring — see exactly why a gadget ranks where it does</li>
              <li>• Performance to Cost index on every product</li>
              <li>• Reviews written by students, for students</li>
              <li>• {GW.community.gadgetsTracked} gadgets tracked · {GW.community.reviewsWritten.toLocaleString()} student reviews in the community</li>
            </ul>
          </div>
          <HeroShowcase />
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-6 px-5 py-6 sm:grid-cols-4 sm:divide-x sm:divide-line">
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
          <h2 className="mt-2 text-2xl font-bold">Lowest monthly cost across the catalog</h2>
          <div className="mx-auto mt-6 max-w-3xl divide-y divide-line rounded-lg border border-line bg-surface">
            {cheapest.map((g, i) => (
              <Link key={g.id} to={`/g/${g.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4 hover:bg-primary-wash sm:flex-nowrap sm:gap-4">
                <span className="mono w-6 text-sm text-ink3">{String(i + 1).padStart(2, "0")}</span>
                <Img gadget={g} className="h-12 w-16 shrink-0" imgClass="p-1" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{g.brand} {g.model}</div>
                  <div className="text-xs text-ink3">{GW.getCategory(g.category).name}</div>
                </div>
                <div className="w-full shrink-0 text-right sm:w-auto">
                  <div className="mono font-semibold text-primary-dark">{money(GW.monthlyCost(g))}/mo</div>
                  <div className="mono text-xs text-ink3">{money(g.price)} upfront</div>
                </div>
                <Oidx g={g} />
              </Link>
            ))}
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
        <div className="mx-auto max-w-[1600px] px-5 py-12">
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
          <Link to="/recommend" className="btn-primary whitespace-nowrap">Find my recommendation</Link>
        </div>
      </section>
    </>
  );
}


export default Home;
