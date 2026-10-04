import { useState } from "react";
import { money, ownIndex, GW } from "../lib.js";

/* Some models already start with the brand ("Acer Aspire 5") — avoid "Acer Acer Aspire 5" */
export const displayName = (g) => (g.model.startsWith(g.brand) ? g.model : `${g.brand} ${g.model}`);

/* Image with a never-blank fallback (Wikimedia hotlinks can fail) */
export function Img({ gadget, className = "", imgClass = "", eager = false, frame = "4 / 3" }) {
  // every frame keeps its caller's aspect so grid rows stay aligned;
  // portrait product shots fit height (cover would cut the product's top and bottom)
  const [ar, setAr] = useState(null);
  const ph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#F1F3F6"/><text x="200" y="155" text-anchor="middle" font-family="Arial" font-size="18" fill="#64748B">${gadget.category}</text></svg>`
    );
  return (
    <div
      className={`overflow-hidden bg-[#E8ECF3] p-2 ${className}`}
      style={{ aspectRatio: frame }}
    >
      <img
        src={gadget.image}
        alt={`${gadget.brand} ${gadget.model}`}
        loading={eager ? "eager" : "lazy"}
        onLoad={(e) => setAr(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        onError={(e) => {
          if (e.currentTarget.src !== ph) e.currentTarget.src = ph;
        }}
        className={`h-full w-full rounded-md ${ar != null && ar < 1 ? "object-contain" : "object-cover"} ${imgClass}`}
      />
    </div>
  );
}

export function Stars({ rating, count }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-1.5 text-sm">
      <span className="inline-flex gap-[1px]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.min(1, Math.max(0, rating - i)); // partial star per decimal
          return (
            <span key={i} className="relative inline-block leading-none">
              <span className="text-line-strong">★</span>
              <span className="absolute inset-0 overflow-hidden text-star" style={{ width: `${fill * 100}%` }}>★</span>
            </span>
          );
        })}
      </span>
      <span className="mono tabular-nums text-ink2">{rating.toFixed(1)}</span>
      {count != null && <span className="tabular-nums text-ink3">({count})</span>}
    </span>
  );
}

export function Oidx({ g, size = "md", compact = false, className = "" }) {
  const tip = "Performance to Cost — battery 25 + student rating 25 + value 30 (price vs category median) + warranty 20";
  if (compact) {
    const score = ownIndex(g);
    return (
      <span className={`inline-flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-sm border border-line bg-transparent px-2 py-2 ${className}`} title={tip} aria-label={`Performance to Cost ${score} of 100`}>
        <span className="flex items-baseline gap-0.5">
          <b className="mono text-xl font-semibold leading-none text-ink">{score}</b>
          <span className="text-xs text-ink3">/100</span>
        </span>
        <span className="h-[3px] w-full overflow-hidden rounded-full bg-line-strong" aria-hidden="true">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
        </span>
      </span>
    );
  }
  return (
    <span className={`oidx ${size === "lg" ? "scale-110 origin-left" : ""} ${className}`} title={tip}>
      <b>{ownIndex(g)}</b>
      <span>PERFORMANCE TO COST</span>
    </span>
  );
}

export function Bar({ v, max = 10, label, mono = false }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink2">{label}</span>
        <span className={`font-semibold text-ink ${mono ? "mono" : ""}`}>{mono ? v : `${v} / ${max}`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
      </div>
    </div>
  );
}

export function GadgetCard({ g, compare, onCompare }) {
  const monthly = GW.monthlyCost(g);
  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,34,.05),0_8px_24px_rgba(15,23,34,.08)]">
      <a href={`#/g/${g.id}`} className="block">
        <div className="relative">
          <Img gadget={g} />
          <Oidx g={g} className="absolute left-3 top-3 bg-white/95" />
        </div>
      </a>
      <div className="flex flex-1 flex-col gap-2 border-t border-line p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{g.brand}</div>
          <a href={`#/g/${g.id}`} className="block min-h-[2.75rem] font-semibold leading-snug text-ink hover:text-primary">
            {g.model}
          </a>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="mono text-base font-semibold text-primary-dark">{money(g.price)}</span>
          <span className="text-xs text-ink3">≈ {money(monthly)}/mo</span>
        </div>
        <Stars rating={g.rating} count={g.reviewCount} />
        <div className="flex flex-wrap gap-1.5">
          <span className="chip-tag">{g.strengths[0]}</span>
          {g.value.warrantyYears >= 2 && <span className="chip-good">Warranty {g.value.warrantyYears}y</span>}
          {g.price > 30000 && <span className="chip-bad">Premium price</span>}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <a href={`#/g/${g.id}`} className="btn-primary flex-1 !py-2 text-center">View details</a>
          {onCompare && (
            <button
              type="button"
              onClick={() => onCompare(g.id)}
              aria-pressed={compare?.has(g.id)}
              className={`btn !px-3 !py-2 border ${compare?.has(g.id) ? "border-primary bg-primary-soft text-primary-dark" : "border-line-strong text-ink2 hover:border-primary hover:text-primary"}`}
            >
              {compare?.has(g.id) ? "✓ Compare" : "Compare"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
