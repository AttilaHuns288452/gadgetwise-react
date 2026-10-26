import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { GW, money } from "../lib.js";
import { OBJECTIVES, paretoFrontier, listingCompleteness } from "../lib/pareto.js";
import { btnOutlineCls } from "./ui.jsx";

/* X-axis candidates (cost-like) and Y-axis candidates (quality-like). Only
   objectives with a real definition for the current marketplace data appear. */
const X_OPTS = ["price", "monthly"];
const Y_OPTS = ["rating", "reviewCount", "completeness"];

const fmt = (key, v) => {
  if (key === "price") return money(v);
  if (key === "monthly") return money(v) + "/mo";
  // ratings arrive as raw marketplace floats; never render one unrounded
  if (key === "rating") return (Math.round(Number(v) * 10) / 10).toFixed(1) + "/5";
  if (key === "reviewCount") return Number(v).toLocaleString() + " reviews";
  return v + "%";
};

function niceTicks(min, max, n = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const out = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-6; t += step) out.push(t);
  return out;
}

// Decade ticks for log axes (raw values back out). 2x/5x marks fill in when
// the visible range is narrow.
function logTicks(lo, hi) {
  const out = [];
  const dense = hi - lo < 2.5;
  for (let e = Math.ceil(lo); e <= hi + 1e-9; e++) {
    out.push(10 ** e);
    if (dense) out.push(2 * 10 ** e, 5 * 10 ** e);
  }
  return out.filter((v) => Math.log10(v) >= lo - 1e-9 && Math.log10(v) <= hi + 1e-9);
}

export default function ParetoExplorer() {
  const [xKey, setXKey] = useState("price");
  const [yKey, setYKey] = useState("rating");
  const [cat, setCat] = useState("all");
  const [brand, setBrand] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [hov, setHov] = useState(null); // {id, x, y}

  const brands = useMemo(() => [...new Set(GW.gadgets.map((g) => g.brand).filter(Boolean))].sort(), []);

  // Filtering changes the comparison population; the frontier is recomputed on
  // it. Computed inline (not memoized): GW.gadgets is mutable module state that
  // fills in asynchronously, so a useMemo on the filter values alone would cache
  // an empty list and never see the catalog.
  // a reversed or negative range is clamped, never treated as "no results"
  const rawMin = minPrice === "" ? null : Number(minPrice);
  const rawMax = maxPrice === "" ? null : Number(maxPrice);
  const minP = rawMin != null && Number.isFinite(rawMin) ? Math.max(0, rawMin) : null;
  const maxP = rawMax != null && Number.isFinite(rawMax) ? Math.max(0, rawMax) : null;
  const lo = minP != null && maxP != null ? Math.min(minP, maxP) : minP;
  const hi = minP != null && maxP != null ? Math.max(minP, maxP) : maxP;
  const minR = minRating === "" ? null : Math.min(5, Math.max(0, Number(minRating) || 0));
  const filtered = GW.gadgets.filter((g) => {
    if (cat !== "all" && g.category !== cat) return false;
    if (brand !== "all" && g.brand !== brand) return false;
    if (lo != null && g.price < lo) return false;
    if (hi != null && g.price > hi) return false;
    if (minR != null && (g.rating || 0) < minR) return false;
    return true;
  });

  const result = paretoFrontier(filtered, [xKey, yKey]);
  const frontierIds = new Set(result.frontier.map((g) => g.id));
  const xo = OBJECTIVES[xKey], yo = OBJECTIVES[yKey];

  // Plot geometry (SVG viewBox). Domains from the eligible points only.
  const pts = result.points.map((p) => ({ g: p.g, x: p.vals[0], y: p.vals[1] }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const xMin = xs.length ? Math.min(...xs) : 0, xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : 0, yMax = ys.length ? Math.max(...ys) : 1;
  // Price-like axes span orders of magnitude (₱293 … ₱139,990): a linear
  // scale smashes ~90% of the dots against the left edge. Log positions for
  // those axes; ratings/percentages stay linear.
  const logish = (k) => k === "price" || k === "monthly" || k === "reviewCount";
  const logX = logish(xKey) && xMin > 0, logY = logish(yKey) && yMin > 0;
  const tx = (v) => (logX ? Math.log10(Math.max(v, 1)) : v);
  const ty = (v) => (logY ? Math.log10(Math.max(v, 1)) : v);
  const X0 = tx(xMin), X1 = tx(xMax), Y0 = ty(yMin), Y1 = ty(yMax);
  const padX = (X1 - X0) * 0.06 || 1, padY = (Y1 - Y0) * 0.10 || 1;
  const dx0 = X0 - padX, dx1 = X1 + padX, dy0 = Y0 - padY, dy1 = Y1 + padY;
  const W = 760, H = 460, padL = 72, padR = 28, padT = 28, padB = 60;
  const iw = W - padL - padR, ih = H - padT - padB;
  const sx = (v) => padL + ((tx(v) - dx0) / (dx1 - dx0)) * iw;
  const sy = (v) => padT + (1 - (ty(v) - dy0) / (dy1 - dy0)) * ih;
  const xTicks = logX ? logTicks(dx0, dx1) : niceTicks(dx0, dx1);
  const yTicks = logY ? logTicks(dy0, dy1) : niceTicks(dy0, dy1);

  // "Most attractive quadrant": the corner where BOTH objectives are better
  // (lower for min-direction, higher for max-direction), split at the median.
  const medX = xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0;
  const medY = ys.length ? [...ys].sort((a, b) => a - b)[Math.floor(ys.length / 2)] : 0;
  const goodXLow = xo.direction === "min";
  const goodYHigh = yo.direction === "max";
  const quad = {
    x: goodXLow ? padL : sx(medX),
    y: goodYHigh ? padT : sy(medY),
    w: goodXLow ? sx(medX) - padL : W - padR - sx(medX),
    h: goodYHigh ? sy(medY) - padT : H - padB - sy(medY),
  };

  // Pareto line: frontier points sorted along X.
  const line = result.frontier
    .map((g) => pts.find((p) => p.g.id === g.id))
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);

  const reset = () => { setCat("all"); setBrand("all"); setMinPrice(""); setMaxPrice(""); setMinRating(""); };

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">X axis
          <select value={xKey} onChange={(e) => setXKey(e.target.value)} className="field min-w-0 !w-auto max-w-[13rem] !py-1.5">
            {X_OPTS.map((k) => <option key={k} value={k}>{OBJECTIVES[k].label} {OBJECTIVES[k].direction === "min" ? "↓" : "↑"}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Y axis
          <select value={yKey} onChange={(e) => setYKey(e.target.value)} className="field min-w-0 !w-auto max-w-[13rem] !py-1.5">
            {Y_OPTS.map((k) => <option key={k} value={k}>{OBJECTIVES[k].label} {OBJECTIVES[k].direction === "min" ? "↓" : "↑"}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Category
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="field min-w-0 !w-auto max-w-[9rem] !py-1.5">
            <option value="all">All</option>
            {GW.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Brand
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="field min-w-0 !w-auto max-w-[9rem] !py-1.5">
            <option value="all">All</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Min ₱
          <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="field ml-2 !w-24 !py-1.5" placeholder="0" />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Max ₱
          <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="field ml-2 !w-24 !py-1.5" placeholder="any" />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm text-ink2">Min rating
          <input type="number" step="0.1" min="0" max="5" value={minRating} onChange={(e) => setMinRating(e.target.value)} className="field ml-2 !w-20 !py-1.5" placeholder="any" />
        </label>
        <button type="button" onClick={reset} className={btnOutlineCls + " !py-1.5 !text-sm"}>Reset</button>
      </div>

      {/* counts */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink2">
        <span><b className="mono">{filtered.length}</b> in scope</span>
        <span className="text-[#c2872f]"><b className="mono">{result.frontier.length}</b> on the frontier</span>
        <span><b className="mono">{result.dominated.length}</b> dominated</span>
        <span className="text-ink3"><b className="mono">{result.excluded.length}</b> excluded (missing {xo.label.toLowerCase()} or {yo.label.toLowerCase()})</span>
      </div>

      {/* chart */}
      {pts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-line-strong p-8 text-center text-ink2">
          No products have both <b>{xo.label}</b> and <b>{yo.label}</b> for this filter. Try widening the filters or a different axis.
        </div>
      ) : (
      <div className="relative mt-4 overflow-x-auto">
        <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full min-w-[560px] max-w-[1100px] overflow-hidden" role="img"
          aria-label={`Scatter plot of ${xo.label} versus ${yo.label} with Pareto frontier`}>
          {/* better-half quadrant: median splits as dashed lines so the box
              has a visible, explained boundary */}
          <rect x={quad.x} y={quad.y} width={Math.max(0, quad.w)} height={Math.max(0, quad.h)} fill="#dcfce7" opacity="0.75" />
          <line x1={sx(medX)} x2={sx(medX)} y1={padT} y2={H - padB} stroke="#94a3b8" strokeDasharray="3 4" opacity="0.6" />
          <line x1={padL} x2={W - padR} y1={sy(medY)} y2={sy(medY)} stroke="#94a3b8" strokeDasharray="3 4" opacity="0.6" />
          <text x={sx(medX) + 4} y={H - padB - 5} fontSize="9" fill="#8a97a8">median {fmt(xKey, medX)}</text>
          <text x={W - padR - 4} y={sy(medY) - 4} fontSize="9" fill="#8a97a8" textAnchor="end">median {fmt(yKey, medY)}</text>
          <text x={quad.x + quad.w - 8} y={quad.y + quad.h - 10} textAnchor="end" fontSize="11" fontWeight="600" fill="#15803d">Better half on both axes</text>

          {/* gridlines + ticks */}
          {yTicks.map((v) => (
            <g key={"y" + v}>
              <line x1={padL} x2={W - padR} y1={sy(v)} y2={sy(v)} stroke="#e3e7ed" />
              <text x={padL - 8} y={sy(v) + 4} textAnchor="end" fontSize="10" fill="#64748b">{fmt(yKey, v)}</text>
            </g>
          ))}
          {xTicks.map((v) => (
            <g key={"x" + v}>
              <line x1={sx(v)} x2={sx(v)} y1={padT} y2={H - padB} stroke="#e3e7ed" />
              <text x={sx(v)} y={H - 34} textAnchor="middle" fontSize="10" fill="#64748b">{fmt(xKey, v)}</text>
            </g>
          ))}

          {/* axis labels with direction (horizontal: rotated text is slow to parse) */}
          <text x={padL} y={16} fontSize="11" fontWeight="600" fill="#3e4c61">
            {yo.label} {yo.direction === "max" ? "↑ higher is better" : "↓ lower is better"}
          </text>
          <text x={padL + iw / 2} y={H - 10} fontSize="11" fontWeight="600" fill="#3e4c61" textAnchor="middle">
            {xo.label} {xo.direction === "min" ? "↓ lower is better" : "↑ higher is better"}{logX ? " · log scale" : ""}
          </text>

          {/* Pareto line through frontier points */}
          {line.length > 1 && (
            <polyline points={line.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} fill="none" stroke="#c2872f" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
          )}

          {/* points: dominated first so frontier draws on top */}
          {pts.filter((p) => !frontierIds.has(p.g.id)).map((p) => (
            <Link key={p.g.id} className="pareto-g" to={`/g/${p.g.id}`} aria-label={`${GW.displayName(p.g)} — ${fmt(xKey, p.x)}, ${fmt(yKey, p.y)}`} onFocus={() => setHov({ id: p.g.id, vx: p.x, vy: p.y, x: sx(p.x), y: sy(p.y) })} onBlur={() => setHov(null)} onMouseEnter={() => setHov({ id: p.g.id, vx: p.x, vy: p.y, x: sx(p.x), y: sy(p.y) })} onMouseLeave={() => setHov(null)}>
              <circle className="pareto-dot" cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#14213a" fillOpacity="0.32" />
              <circle cx={sx(p.x)} cy={sy(p.y)} r={13} fill="transparent" />
            </Link>
          ))}
          {pts.filter((p) => frontierIds.has(p.g.id)).map((p) => (
            <Link key={p.g.id} className="pareto-g" to={`/g/${p.g.id}`} aria-label={`${GW.displayName(p.g)} — ${fmt(xKey, p.x)}, ${fmt(yKey, p.y)}`} onFocus={() => setHov({ id: p.g.id, vx: p.x, vy: p.y, x: sx(p.x), y: sy(p.y) })} onBlur={() => setHov(null)} onMouseEnter={() => setHov({ id: p.g.id, vx: p.x, vy: p.y, x: sx(p.x), y: sy(p.y) })} onMouseLeave={() => setHov(null)}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={13} fill="#c2872f" fillOpacity="0.16" />
              <circle className="pareto-dot" cx={sx(p.x)} cy={sy(p.y)} r={8} fill="#c2872f" stroke="#fff" strokeWidth="2" />
              <circle cx={sx(p.x)} cy={sy(p.y)} r={13} fill="transparent" />
              <text x={sx(p.x) + 12} y={sy(p.y) - 10} fontSize="10" fontWeight="600" fill="#8a5c12" stroke="#fff" strokeWidth="3" paintOrder="stroke">{fmt(xKey, p.x)} · {fmt(yKey, p.y)}</text>
            </Link>
          ))}
        </svg>
        </div>

        {/* tooltip */}
        {hov && (() => {
          const g = GW.getGadget(hov.id);
          const isP = frontierIds.has(hov.id);
          if (!g) return null;
          return (
            <div className="pointer-events-none absolute z-10 w-[230px] rounded-lg border border-line-strong bg-white p-3 shadow-lg"
              style={{ left: `min(calc(${(hov.x / W) * 100}% + 14px), calc(100% - 244px))`, top: `max(8px, calc(${(hov.y / H) * 100}% - 84px))` }}>
              <p className="font-semibold text-ink">{GW.displayName(g)}</p>
              <p className="mt-1 text-sm text-ink2">{xo.label}: <b className="mono">{fmt(xKey, hov.vx)}</b></p>
              <p className="text-sm text-ink2">{yo.label}: <b className="mono">{fmt(yKey, hov.vy)}</b></p>
              <p className={`mt-1 text-xs font-semibold ${isP ? "text-[#c2872f]" : "text-ink3"}`}>{isP ? "On the frontier" : "Dominated"} · click for details</p>
            </div>
          );
        })()}
      </div>
      )}

      {/* legend + explanation */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink2">
        <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c2872f]" />Frontier (nothing beats it on both axes)</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#14213a] opacity-60" />Dominated</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-[#dcfce7]" />Better half on both axes (median split)</span>
      </div>
      <p className="mt-1.5 max-w-[70ch] text-sm text-ink3">
        A product is on the <b>Pareto frontier</b> when no other in-scope product is at least as good on both axes and strictly better on one. The green quadrant is simply the better half on each axis — a hint, not a ranking. Products missing either value are excluded rather than guessed.
      </p>

      {/* frontier shortlist */}
      {result.frontier.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-ink">Frontier shortlist</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.frontier.slice(0, 9).map((g) => (
              <li key={g.id} className="min-w-0">
                <Link to={`/g/${g.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-[#c2872f]">
                  <span className="min-w-0 truncate text-ink">{GW.displayName(g)}</span>
                  <span className="mono shrink-0 text-xs text-ink2">{fmt(xKey, xo.get(g))} · {fmt(yKey, yo.get(g))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
