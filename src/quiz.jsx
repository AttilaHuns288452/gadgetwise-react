import { useState } from "react";
import { GW, money, recommend, FACTOR_META } from "./lib.js";
import { Img, Oidx, displayName } from "./ui.jsx";

const STEP_META = [
  ["What are you looking for?", "Pick a gadget type"],
  ["Budget", "What can you spend?"],
  ["Academic use", "What is it for?"],
  ["Priorities", "What matters most?"],
  ["Results", "Ranked shortlist"],
];

const LEVELS = ["none", "low", "medium", "high"];

function Stepper({ step, answers }) {
  return (
    <ol className="space-y-1">
      {STEP_META.map(([title, sub], i) => {
        const n = i + 1;
        const cur = n === step;
        const done = n < step;
        return (
          <li key={title} className={`flex items-start gap-3 rounded-sm px-3 py-2.5 ${cur ? "bg-primary-wash border border-primary-soft" : ""}`}>
            <span className={`mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-primary text-white" : cur ? "bg-primary text-white" : "bg-surface2 text-ink2"}`}>
              {n}
            </span>
            <div>
              <div className={`text-sm font-semibold ${cur ? "text-primary-dark" : "text-ink"}`}>{title}</div>
              <div className="text-xs text-ink3">{n < step ? (answers[i] || sub) : sub}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Quiz() {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState("");
  const [bandId, setBandId] = useState("20-40k");
  const [custom, setCustom] = useState({ min: "", max: "" });
  const [useId, setUseId] = useState("general");
  const [prio, setPrio] = useState({
    performance: "high", battery: "medium", value: "medium",
    portability: "none", display: "none", camera: "none", storage: "none",
    budget: "medium",
  });

  const band = bandId === "custom"
    ? { id: "custom", label: "Custom range", min: +custom.min || 0, max: +custom.max || Infinity }
    : GW.budgetBands.find((b) => b.id === bandId);
  const useCase = GW.useCases.find((u) => u.id === useId);

  const answers = [
    cat ? (cat === "any" ? "Any gadget type" : GW.getCategory(cat).name) : "",
    band ? band.label : "",
    useCase ? useCase.label : "",
    "",
    "",
  ];

  const result = step === 5
    ? recommend({ budget: band, useCase, priorities: prio, category: cat === "any" ? null : cat })
    : null;

  const setP = (f, v) => setPrio((p) => ({ ...p, [f]: v }));

  return (
    <section className="section">
      <div className="eyebrow">Recommendation tool</div>
      <h1 className="mt-2">Find the right gadget for how you actually study</h1>
      <p className="mt-2 max-w-2xl text-ink2">
        Five questions, transparent weights. The score on every result is fully explained — nothing is a
        black box.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="card p-3 lg:self-stretch"><Stepper step={step} answers={answers} /></div>

        <div>
          {step === 1 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold">What are you looking for?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[{ id: "any", name: "Not sure yet — show me everything", blurb: "Rank the whole catalog." }, ...GW.categories].map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCat(c.id); setStep(2); }}
                    className={`rounded-sm border p-4 text-left transition-colors sm:[&:last-child:nth-child(odd)]:col-span-2 ${
                      cat === c.id ? "border-primary bg-primary-wash" : "border-line-strong hover:border-primary"}`}>
                    <div className="font-semibold">{c.name}</div>
                    <div className="mt-1 text-sm text-ink3">{c.blurb || ""}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold">What can you spend?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {GW.budgetBands.map((b) => (
                  <button key={b.id} type="button" onClick={() => { setBandId(b.id); setStep(3); }}
                    className={`rounded-sm border p-4 text-left transition-colors sm:[&:last-child:nth-child(odd)]:col-span-2 ${
                      bandId === b.id ? "border-primary bg-primary-wash" : "border-line-strong hover:border-primary"}`}>
                    <div className="mono font-semibold">{b.label}</div>
                  </button>
                ))}
                <button type="button" onClick={() => { setBandId("custom"); }}
                  className={`rounded-sm border p-4 text-left transition-colors sm:[&:last-child:nth-child(odd)]:col-span-2 ${
                    bandId === "custom" ? "border-primary bg-primary-wash" : "border-line-strong hover:border-primary"}`}>
                  <div className="mono font-semibold">Custom range</div>
                  <div className="mt-2 flex gap-2">
                    <input type="number" min="0" placeholder="Min ₱" value={custom.min} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCustom((c) => ({ ...c, min: e.target.value }))} className="field !py-1.5" aria-label="Minimum budget" />
                    <input type="number" min="0" placeholder="Max ₱" value={custom.max} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCustom((c) => ({ ...c, max: e.target.value }))} className="field !py-1.5" aria-label="Maximum budget" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold">What is it for?</h2>
              <div className="mt-4 space-y-3">
                {GW.useCases.map((u) => (
                  <button key={u.id} type="button" onClick={() => { setUseId(u.id); setStep(4); }}
                    className={`block w-full rounded-sm border p-4 text-left transition-colors ${
                      useId === u.id ? "border-primary bg-primary-wash" : "border-line-strong hover:border-primary"}`}>
                    <div className="font-semibold">{u.label}</div>
                    <div className="mt-1 text-sm text-ink3">{u.note}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold">What matters most?</h2>
              <p className="mt-1 text-sm text-ink3">
                High pushes weight toward a factor, low pulls it away. “Budget discipline” controls how far
                above your ceiling we still rank gadgets (high = 5%, medium = 15%, otherwise 35%).
              </p>
              <div className="mt-5 space-y-4">
                {Object.entries(FACTOR_META).map(([f, meta]) => (
                  <div key={f} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{meta.label}</div>
                      <div className="text-xs text-ink3">Base weight {meta.raw}/50 adjustable points</div>
                    </div>
                    <div className="flex gap-1">
                      {LEVELS.map((lv) => (
                        <button key={lv} type="button" onClick={() => setP(f, lv)}
                          className={`chip !px-3 !py-1.5 capitalize ${
                            prio[f] === lv ? "bg-primary text-white" : "chip-neutral hover:border-primary"}`}>
                          {lv}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <div>
                    <div className="font-medium">Budget discipline</div>
                    <div className="text-xs text-ink3">How strictly to stay under your ceiling</div>
                  </div>
                  <div className="flex gap-1">
                    {LEVELS.map((lv) => (
                      <button key={lv} type="button" onClick={() => setP("budget", lv)}
                        className={`chip !px-3 !py-1.5 capitalize ${
                          prio.budget === lv ? "bg-primary text-white" : "chip-neutral hover:border-primary"}`}>
                        {lv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && result && (
            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold">Your ranked shortlist</h2>
                <p className="mt-1 text-sm text-ink2">
                  {result.results.length} gadget{result.results.length === 1 ? "" : "s"} ranked ·
                  stretch limit {result.stretchLimit ? money(result.stretchLimit) : "none (open budget)"}
                  {result.hiddenCount > 0 ? ` · ${result.hiddenCount} excluded above the stretch limit` : ""}
                </p>
                {result.notes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-ink3">
                    {result.notes.map((n) => <li key={n}>• {n}</li>)}
                  </ul>
                )}
              </div>

              {result.results.map((r, i) => (
                <div key={r.gadget.id} className="card overflow-hidden">
                  <div className="flex flex-wrap items-start gap-4 p-5">
                    <div className="mono flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary-dark">
                      {r.score}
                    </div>
                    <Img gadget={r.gadget} className="h-20 w-28 shrink-0" imgClass="p-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="mono text-xs text-ink3">#{i + 1}</span>
                        <a href={`#/g/${r.gadget.id}`} className="text-lg font-semibold hover:text-primary">
                          {displayName(r.gadget)}
                        </a>
                        <Oidx g={r.gadget} />
                      </div>
                      <div className="mt-1 text-sm text-ink3">
                        <span className="mono">{money(r.gadget.price)}</span> · ≈ <span className="mono">{money(GW.monthlyCost(r.gadget))}/month</span>
                      </div>
                      {r.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.reasons.map((x) => <span key={x} className="chip-blue">{x}</span>)}
                        </div>
                      )}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-sm bg-success-soft p-2.5 text-xs text-success">
                          <b>Strengths:</b> {r.strengths.join(" · ")}
                        </div>
                        <div className="rounded-sm bg-danger-soft p-2.5 text-xs text-danger">
                          <b>Weaknesses:</b> {r.weaknesses.join(" · ")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <details className="border-t border-line">
                    <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-primary-dark">
                      Why this score? ({r.score}/100, every point)
                    </summary>
                    <div className="space-y-3 px-5 pb-5">
                      {r.breakdown.factors.map((f) => (
                        <div key={f.key}>
                          <div className="flex justify-between text-sm">
                            <span className="text-ink2">{f.label}</span>
                            <span className="mono font-semibold">{f.earned} / {f.max}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-surface2">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(f.earned / f.max) * 100}%` }} />
                          </div>
                          {f.note && <div className="mt-0.5 text-xs text-ink3">{f.note}</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center gap-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost">← Back</button>
            )}
            {step > 1 && step < 5 && (
              <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">
                {step === 4 ? "See results" : "Next"}
              </button>
            )}
            {step === 5 && (
              <>
                <button type="button" onClick={() => setStep(1)} className="btn-primary">Start over</button>
                <a href="#/gadgets" className="btn-ghost">Browse instead</a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
