import { useState, useEffect } from "react";
import { money, ownIndex, GW } from "../lib.js";

/* Canonical name builder lives on GW (data.js) so moderation rows match the UI */
export const displayName = (g) => GW.displayName(g);

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

/* Wishlist: localStorage-backed so cards, navbar and the Wishlist page
   share one list without prop drilling. */
let _wishListeners = [];
function _wishRead() {
  try {
    const raw = localStorage.getItem("gw_wishlist");
    if (raw === null) {
      // ponytail: seeded demo wishlist (the Figma account page's 3 saved gadgets)
      const seeded = ["apple-macbook-air-m1", "samsung-galaxy-s23", "xiaomi-pad-7"];
      localStorage.setItem("gw_wishlist", JSON.stringify(seeded));
      return new Set(seeded);
    }
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}
function _wishWrite(set) {
  localStorage.setItem("gw_wishlist", JSON.stringify([...set]));
  _wishListeners.forEach((fn) => fn(set));
}
export function useWishlist() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _wishListeners.push(fn);
    return () => {
      _wishListeners = _wishListeners.filter((f) => f !== fn);
    };
  }, []);
  const ids = _wishRead();
  return {
    ids,
    has: (id) => ids.has(id),
    toggle: (id) => {
      const s = _wishRead();
      s.has(id) ? s.delete(id) : s.add(id);
      _wishWrite(s);
    },
  };
}

export function GadgetCard({ g, compare, onCompare }) {
  const monthly = GW.monthlyCost(g);
  const wish = useWishlist();
  const [toast, toastNode] = useToast();
  const catName = GW.categories.find((c) => c.id === g.category)?.name || g.category;
  const specRows = Object.entries(g.specs || {}).slice(0, 3);
  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,34,.05),0_8px_24px_rgba(15,23,34,.08)]">
      <a href={`#/g/${g.id}`} className="block">
        <div className="relative">
          <Img gadget={g} />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink2 shadow-sm">{catName}</span>
        </div>
      </a>
      <div className="flex flex-1 flex-col gap-2.5 border-t border-line p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{g.brand}</div>
          <a href={`#/g/${g.id}`} className="block min-h-[2.75rem] font-semibold leading-snug text-ink hover:text-primary">
            {g.model}
          </a>
        </div>
        <Stars rating={g.rating} count={g.reviewCount} />
        <div><Oidx g={g} /></div>
        {g.goodFor?.length > 0 && (
          <p className="text-sm text-ink2">
            <b className="font-semibold text-ink">Best for:</b> {g.goodFor.slice(0, 2).join(" + ")}
          </p>
        )}
        <dl className="text-sm">
          {specRows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 first:border-t-0">
              <dt className="text-ink3">{k}</dt>
              <dd className="text-right font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="mono text-xl font-bold text-ink">{money(g.price)}</span>
            <button
              type="button"
              onClick={() => {
                const adding = !wish.has(g.id);
                wish.toggle(g.id);
                if (adding) toast("Added to wishlist");
              }}
              aria-pressed={wish.has(g.id)}
              aria-label={wish.has(g.id) ? "Remove from wishlist" : "Add to wishlist"}
              className={`rounded-full border p-2 transition-colors ${wish.has(g.id) ? "border-[#B07C28] bg-[#FBF5E7] text-[#B07C28]" : "border-line-strong text-ink3 hover:border-[#B07C28] hover:text-[#B07C28]"}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={wish.has(g.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
            </button>
          </div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-ink3">Per month ≈ {money(monthly)}/month</div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            {onCompare ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink2">
                <input
                  type="checkbox"
                  checked={!!compare?.has(g.id)}
                  onChange={() => onCompare(g.id)}
                  className="h-4 w-4 rounded border-line-strong text-primary focus:ring-primary"
                />
                Compare
              </label>
            ) : <span />}
            <a href={`#/g/${g.id}`} className="font-semibold text-primary hover:text-primary-dark">Details</a>
          </div>
        </div>
      </div>
      {toastNode}
    </article>
  );
}

export const btnCls = "rounded-lg px-7 py-2.5 text-[15px] font-semibold transition-colors";
export const btnPrimaryCls = btnCls + " bg-[#2563EB] text-white hover:bg-[#1D4ED8]";
export const btnOutlineCls = btnCls + " border border-[#C7C7CC] bg-white text-[#111827] hover:bg-[#F9FAFB]";
export const btnDangerCls = btnCls + " bg-[#B3372E] text-white hover:bg-[#93291F]";
export const fieldLabelCls = "block text-[15px] font-bold text-[#111827]";
export const fieldInputCls = "mt-2.5 w-full rounded-[10px] border border-[#C7C7CC] px-5 py-3.5 text-[17px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";

export function Modal({ title, sub, children, actions, onClose }) {
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(28,33,38,0.5)] p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[86vh] w-[min(520px,100%)] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <h3 className="text-[22px] font-bold leading-snug text-[#111827]">{title}</h3>
        {sub && <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{sub}</p>}
        <div className="mt-6 space-y-5">{children}</div>
        <div className="mt-6 flex justify-end gap-2.5">{actions}</div>
      </div>
    </div>
  );
}

const toastIco = {
  checkCircle: <><circle cx="8" cy="8" r="6.5" /><path d="m5.2 8.2 2 2 3.6-3.9" /></>,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  trash: <path d="M2.5 4.5h11M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8" />,
  edit: <path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5z" />,
  alert: <><circle cx="8" cy="8" r="6.5" /><path d="M8 5v3.5M8 11h.01" /></>,
  info: <><circle cx="8" cy="8" r="6.5" /><path d="M8 7.5v3.5M8 5h.01" /></>,
};

export function useToast() {
  const [items, setItems] = useState([]);
  const toast = (text, icon = "checkCircle") => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, text, icon }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  };
  const node = (
    <div className="fixed bottom-[88px] right-6 z-[100] grid gap-2.5">
      {items.map((t) => (
        <div key={t.id} className="toast-in flex items-center gap-2.5 rounded-2xl bg-[#0F1722] px-[18px] py-3 text-sm font-semibold text-white shadow-2xl">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#9CC3EE]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{toastIco[t.icon] || toastIco.checkCircle}</svg>
          {t.text}
        </div>
      ))}
    </div>
  );
  return [toast, node];
}
