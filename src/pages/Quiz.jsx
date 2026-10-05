// Quiz — /recommend · "Get Recommendations"
// 5-step flow: category → budget → academic use → priorities → ranked results.
// Scoring engine is recommend() in lib.js — this file is UI + copy only.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GW, money, FACTOR_META, recommend } from "../lib.js";
import { Bar, useToast, useWishlist, btnPrimaryCls, btnOutlineCls } from "../components/ui.jsx";

const CATS = [
  { id: "smartphones", name: "Smartphones", blurb: "Everyday carry, notes, hotspot" },
  { id: "laptops", name: "Laptops", blurb: "Heavy work, code, thesis builds" },
  { id: "tablets", name: "Tablets", blurb: "Stylus notes, PDFs, media" },
  { id: "headphones", name: "Headphones", blurb: "Focus, commutes, calls" },
  { id: "powerbanks", name: "Power Banks", blurb: "Brownout and long-day insurance" },
  { id: "smartwatches", name: "Smartwatches", blurb: "Alarms, health, time management" },
];

// Sub-lines under each budget bracket card, in GW.budgetBands order.
const BAND_SUB = ["₱0 – ₱10,000", "₱10,000 – ₱20,000", "₱20,000 – ₱40,000", "₱40,000 – ₱60,000", "Flagship territory"];

const CUSTOM_CHIPS = [
  [15000, "₱15,000"], [20000, "₱20,000"], [30000, "₱30,000"], [45000, "₱45,000"], [60000, "₱60,000+"],
];

const LEVELS = [["none", "—"], ["low", "Low"], ["medium", "Med"], ["high", "High"]];

const SCORE_BARS = [
  ["performance", "Performance"], ["battery", "Battery"], ["durability", "Durability"], ["portability", "Portability"],
  ["display", "Display"], ["camera", "Camera"], ["storage", "Storage"], ["repairability", "Repairability"],
];

const FIXED_CHIPS = ["Budget fit · 20 pts fixed", "Academic fit · 25 pts fixed", "Community · 5 pts fixed"];
const ADJ_CHIPS = Object.entries(FACTOR_META)
  .filter(([, m]) => m.raw > 0)
  .map(([k, m]) => `${m.label} · ${m.raw} pts`);

const TITLES = ["What are you looking for?", "Budget", "Academic use", "Priorities", "Results"];

const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || "";
const bandFor = (n) => GW.budgetBands.find((b) => n >= b.min && n < b.max) || GW.budgetBands[0];

const optionCls = (on) =>
  `rounded-2xl border p-5 text-left transition-colors ${
    on ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary"
  }`;

export default function Quiz({ compare: compareProp, onCompare: onCompareProp }) {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState(null);
  const [bandId, setBandId] = useState(null);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("30000");
  const [useId, setUseId] = useState(null);
  const [prio, setPrio] = useState({
    performance: "none", battery: "none", portability: "none", display: "none",
    camera: "none", storage: "none", value: "none", budget: "none",
  });
  const [toast, toastNode] = useToast();
  const wish = useWishlist();
  const navigate = useNavigate();

  // ponytail: App renders <Quiz /> bare today; fall back to local toggles if props ever arrive
  const [localCompare, setLocalCompare] = useState(new Set());
  const compare = compareProp || localCompare;
  const onCompare =
    onCompareProp ||
    ((id) =>
      setLocalCompare((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }));

  const band = custom ? bandFor(Number(amount) || 0) : GW.budgetBands.find((b) => b.id === bandId) || null;
  const useCase = GW.useCases.find((u) => u.id === useId) || null;

  const engine = useMemo(() => {
    if (!cat || !band || !useCase) return null;
    return recommend({ category: cat, budget: band, useCase, priorities: prio });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, band && band.id, useId, prio]);
  const results = engine ? engine.results.slice(0, 5) : [];
  const summary = cat && band && useCase ? `${catName(cat)} · ${band.label} · ${useCase.label}` : "";

  useEffect(() => {
    if (step === 5 && engine && results.length) {
      toast(`Shortlist ready — showing the top ${results.length} of ${engine.results.length}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const subs = [
    "",
    catName(cat) || "Pick a gadget type",
    band ? band.label : "What can you spend?",
    useCase ? useCase.label : "What is it for?",
    "What matters most?",
    summary || "Ranked shortlist",
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 lg:px-12 pb-24 pt-10">
      <h1 className="text-[32px] font-extrabold leading-tight">Get Recommendations</h1>
      <p className="mt-2 max-w-[560px] text-ink2">
        Three questions, then a ranked shortlist. Every score shows its full breakdown.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* LEFT — numbered steps */}
        <nav aria-label="Quiz steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol>
            {TITLES.map((t, i) => {
              const n = i + 1;
              const active = step === n;
              return (
                <li key={n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                        active ? "bg-primary text-white" : n < step ? "bg-primary-soft text-primary-dark" : "bg-surface2 text-ink2"
                      }`}
                    >
                      {n}
                    </span>
                    {n < TITLES.length && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <button
                    type="button"
                    disabled={n > step}
                    onClick={() => setStep(n)}
                    className={`pb-7 text-left ${n > step ? "cursor-default" : ""}`}
                  >
                    <div className={active ? "font-bold text-ink" : "font-semibold text-ink2"}>{t}</div>
                    <div className="mt-0.5 text-sm text-ink2">{subs[n]}</div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* RIGHT — current step */}
        <section className="min-w-0">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-extrabold">What are you looking for?</h2>
              <p className="mt-1.5 text-ink2">
                Only that category gets ranked — a laptop is never compared against a power bank.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CATS.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} className={optionCls(cat === c.id)}>
                    <div className="text-lg font-bold">{c.name}</div>
                    <div className="mt-1 text-sm text-ink2">{c.blurb}</div>
                  </button>
                ))}
              </div>
              <div className="mt-7">
                <button type="button" disabled={!cat} onClick={() => setStep(2)} className={`${btnPrimaryCls} disabled:opacity-40`}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-extrabold">What's your budget?</h2>
              <p className="mt-1.5 text-ink2">Realistic student brackets, or set a custom ceiling.</p>
              {!custom ? (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {GW.budgetBands.map((b, i) => (
                      <button key={b.id} type="button" onClick={() => setBandId(b.id)} className={optionCls(band && band.id === b.id)}>
                        <div className="text-lg font-bold">{b.label}</div>
                        <div className="mt-1 text-sm text-ink2">{BAND_SUB[i]}</div>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setCustom(true)} className="mt-5 text-sm font-semibold text-primary hover:underline">
                    Set a custom budget instead
                  </button>
                </>
              ) : (
                <div className="mt-6 max-w-[420px]">
                  <label htmlFor="budget-amount" className="block text-[15px] font-bold">
                    Budget amount
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-line-strong px-4">
                    <span className="text-ink2">₱</span>
                    <input
                      id="budget-amount"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full min-w-0 bg-transparent py-3 outline-none"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CUSTOM_CHIPS.map(([v, label]) => (
                      <button key={label} type="button" onClick={() => setAmount(String(v))} className="chip">
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-ink2">
                    Range <span className="mono font-semibold text-ink">{band.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBandId(band.id);
                      setCustom(false);
                    }}
                    className="mt-4 text-sm font-semibold text-primary hover:underline"
                  >
                    Pick a bracket instead
                  </button>
                </div>
              )}
              <div className="mt-7 flex gap-3">
                <button type="button" className={btnOutlineCls} onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className={btnPrimaryCls} onClick={() => setStep(3)}>
                  Continue
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-extrabold">What will you use it for?</h2>
              <p className="mt-1.5 text-ink2">Pick one primary use. Scoring changes with the workload.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GW.useCases.map((u) => (
                  <button key={u.id} type="button" onClick={() => setUseId(u.id)} className={optionCls(useId === u.id)}>
                    <div className="text-lg font-bold">{u.label}</div>
                    <div className="mt-1 text-sm text-ink2">{u.note}</div>
                  </button>
                ))}
              </div>
              <div className="mt-7 flex gap-3">
                <button type="button" className={btnOutlineCls} onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" disabled={!useId} onClick={() => setStep(4)} className={`${btnPrimaryCls} disabled:opacity-40`}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-extrabold">What matters most to you?</h2>
              <p className="mt-1.5 text-ink2">
                Your picks shift scoring weight. Leave everything on “—” for a balanced score.
              </p>
              <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-ink2">
                50 of the 100 points are redistributed by these priorities. Budget fit (20), academic suitability (25),
                and community rating (5) stay fixed.
              </p>
              <div className="mt-5 grid gap-3">
                {GW.priorityFactors.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="font-bold">{f.label}</div>
                      <div className="text-sm text-ink2">{f.hint}</div>
                    </div>
                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-line-strong">
                      {LEVELS.map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPrio((p) => ({ ...p, [f.id]: v }))}
                          className={`px-3.5 py-2 text-sm font-semibold transition-colors ${
                            prio[f.id] === v ? "bg-primary text-white" : "bg-white text-ink2 hover:bg-surface2"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex gap-3">
                <button type="button" className={btnOutlineCls} onClick={() => setStep(3)}>
                  Back
                </button>
                <button type="button" className={btnPrimaryCls} onClick={() => setStep(5)}>
                  Calculate recommendations
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">Your ranked shortlist</h2>
                  <p className="mt-1 text-ink2">Based on {summary}</p>
                </div>
                <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-primary hover:underline">
                  Change answers
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-line px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink2">Scoring weights</div>
                <div className="mt-1 text-sm text-ink2">Adjustable 50 pts after your priorities</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...FIXED_CHIPS, ...ADJ_CHIPS].map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                {results.map((r, i) => {
                  const g = r.gadget;
                  return (
                    <article key={g.id} className="card p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <span className="mono text-xl font-semibold text-ink2">#{i + 1}</span>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink2">
                              {g.brand} · {catName(g.category)}
                            </div>
                            <h3 className="mt-1 text-2xl font-extrabold leading-tight">{g.model}</h3>
                            <div className="mono mt-1 text-sm text-ink2">
                              {g.rating.toFixed(1)} ({g.reviewCount})
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="mono text-3xl font-extrabold">{r.score}</span>{" "}
                          <span className="mono text-sm text-ink2">/ 100</span>
                        </div>
                      </div>

                      {i === 0 && (
                        <div className="mt-3">
                          <span className="chip-blue">BEST MATCH</span>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xl font-bold">{money(g.price)}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink2">Per month</span>
                        <span className="mono text-sm text-ink2">≈ {money(GW.monthlyCost(g))}/month</span>
                      </div>

                      <div className="mt-5 grid gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink2">Why it ranks here</h4>
                          <ul className="mt-3 grid gap-2">
                            {r.reasons.map((s, j) => (
                              <li key={j} className="text-sm">
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink2">
                            Strengths &amp; weaknesses
                          </h4>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <ul className="grid gap-2">
                              {r.strengths.slice(0, 3).map((s, j) => (
                                <li key={j} className="text-sm text-ink2">
                                  — {s}
                                </li>
                              ))}
                            </ul>
                            <ul className="grid gap-2">
                              {r.weaknesses.slice(0, 3).map((s, j) => (
                                <li key={j} className="text-sm text-ink2">
                                  — {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <details className="mt-5">
                        <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                          Show score breakdown
                        </summary>
                        <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                          {SCORE_BARS.map(([k, label]) => (
                            <Bar key={k} v={g.scored[k]} label={label} />
                          ))}
                        </div>
                      </details>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <button
                          type="button"
                          onClick={() => onCompare(g.id)}
                          className={compare.has(g.id) ? "chip-blue" : "chip"}
                        >
                          Compare this gadget
                        </button>
                        <div className="flex items-center gap-5">
                          <button
                            type="button"
                            onClick={() => wish.toggle(g.id)}
                            className={`text-sm font-semibold ${wish.has(g.id) ? "text-primary" : "text-ink2 hover:text-primary"}`}
                          >
                            Save
                          </button>
                          <Link to={`/g/${g.id}`} className="text-sm font-semibold text-primary hover:underline">
                            Details
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      {toastNode}
    </main>
  );
}
