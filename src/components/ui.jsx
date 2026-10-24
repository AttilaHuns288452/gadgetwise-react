import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { money, ownIndex, GW } from "../lib.js";
import { useAuth, useAuthPrompt, requireAuth } from "../lib/auth.js";
import { loadWishlist, syncWishlist, voteReview } from "../lib/store.js";

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
        src={gadget.image || ph}
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

/* Clickable 1-5 star rating input. Replaces word-label dropdowns so users rate
   with stars everywhere a rating is entered. Keyboard: arrows via native radio. */
export function StarPicker({ value, onChange, id, label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div id={id} role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`rounded p-0.5 text-2xl leading-none transition-transform hover:scale-110 focus-visible:outline-2 ${n <= shown ? "text-star" : "text-line-strong"}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-ink2">{shown}/5</span>
    </div>
  );
}

const ThumbIcon = ({ down = false }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {down
      ? <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
      : <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />}
  </svg>
);

/* Public like / dislike on a review. One vote per signed-in user; clicking the
   same choice again removes it. Counts come from review_votes (RLS owner-write). */
export function ReviewVotes({ review }) {
  const [votes, setVotes] = useState(review.votes || { up: 0, down: 0, mine: 0 });
  const [busy, setBusy] = useState(false);
  const [toast, toastNode] = useToast();
  const cast = async (value) => {
    if (!requireAuth(value === 1 ? "like this review" : "dislike this review")) return;
    if (busy) return;
    setBusy(true);
    const res = await voteReview(review.id, value);
    setBusy(false);
    if (!res.ok) { toast(res.error || "Could not save your vote", "alert"); return; }
    setVotes((v) => {
      const next = { up: v.up, down: v.down, mine: res.value };
      if (v.mine === 1) next.up -= 1;
      if (v.mine === -1) next.down -= 1;
      if (res.value === 1) next.up += 1;
      if (res.value === -1) next.down += 1;
      return next;
    });
  };
  const btn = (value, label, icon, count) => (
    <button
      type="button"
      aria-pressed={votes.mine === value}
      onClick={() => cast(value)}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        votes.mine === value
          ? value === 1
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-red-300 bg-red-50 text-red-700"
          : "border-line-strong text-ink2 hover:border-primary hover:text-primary"
      }`}
    >
      {icon}
      {label}
      <span className="tabular-nums">{count}</span>
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn(1, "Like", <ThumbIcon />, votes.up)}
      {btn(-1, "Dislike", <ThumbIcon down />, votes.down)}
      {toastNode}
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
      {count != null && <span className="tabular-nums text-ink3">({count.toLocaleString()})</span>}
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

export function Bar({ v, max = 10, label, mono = false, unavailable = false }) {
  // Trust the explicit `unavailable` flag. `v` may be a numeric string ("5.0")
  // from callers like s5(), so only real null/undefined counts as missing.
  if (unavailable || v == null) {
    return (
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink2">{label}</span>
          <span className="text-ink3">Not available</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-surface2" />
      </div>
    );
  }
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
// per-user local key: a signed-out guest or a different account on the same
// browser must never see the previous account's saved gadgets
const _wishKey = (uid) => `gw_wishlist:${uid || "guest"}`;
// bumped on every local change so an in-flight load can never clobber a newer
// toggle (which would then be mirrored to the DB and delete real rows)
let _wishLocalSeq = 0;
let _wishLoadedUid = null; // first uid whose list was fetched this session
function _wishRead(key) {
  // Real wishlist only: whatever the user actually saved. No seeded demo items —
  // a fresh account starts empty instead of showing gadgets they never saved.
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}
function _wishWrite(set, key) {
  localStorage.setItem(key, JSON.stringify([...set]));
  _wishListeners.forEach((fn) => fn(set));
}
export function useWishlist() {
  const [, force] = useState(0);
  const { user } = useAuth();
  const uid = user?.id || user?.email || null;
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _wishListeners.push(fn);
    return () => {
      _wishListeners = _wishListeners.filter((f) => f !== fn);
    };
  }, []);
  // Signed-in users: load from the database once, then keep it as the source of
  // truth. Guests stay on localStorage (seeded demo list).
  useEffect(() => {
    if (!uid) return;
    if (_wishLoadedUid === uid) return; // one fetch per user, not per card
    _wishLoadedUid = uid;
    const seq = _wishLocalSeq;
    loadWishlist(uid).then((set) => {
      // only apply the remote list if the user hasn't changed anything since
      if (set && seq === _wishLocalSeq) _wishWrite(set, _wishKey(uid));
    });
  }, [uid]);
  const ids = _wishRead(_wishKey(uid));
  return {
    ids,
    has: (id) => ids.has(id),
    // returns true only when the save actually changed
    toggle: (id) => {
      // Account-gated: favourites are user data, so a guest must sign in first.
      if (!requireAuth("save gadgets to your wishlist")) return false;
      const s = _wishRead(_wishKey(uid));
      s.has(id) ? s.delete(id) : s.add(id);
      _wishLocalSeq += 1;
      _wishWrite(s, _wishKey(uid));
      if (uid) syncWishlist(uid, [...s]); // mirror to DB; RLS enforces ownership
      return true;
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
    <article
      className={`card hover-lift flex flex-col overflow-hidden transition-shadow ${compare?.has(g.id) ? "ring-2 ring-primary shadow-md" : ""}`}
    >
      <a href={`#/g/${g.id}`} className="block">
        <div className="relative">
          <Img gadget={g} className="card-media" />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink2 shadow-sm">{catName}</span>
        </div>
      </a>
      <div className="flex flex-1 flex-col gap-2.5 border-t border-line p-4">
        <div>
          {g.brand && g.brand !== "Unknown" && (
            <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{g.brand}</div>
          )}
          <a href={`#/g/${g.id}`} title={g.model} className="line-clamp-2 h-[3.1rem] overflow-hidden text-lg font-semibold leading-snug text-ink hover:text-primary [overflow-wrap:anywhere]">
            {g.model}
          </a>
        </div>
        <Stars rating={g.rating} count={g.reviewCount} />
        <div className="self-start"><Oidx g={g} /></div>
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
          <div>
            <span className="mono text-xl font-bold text-ink">{money(g.price)}</span>
          </div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-ink3">≈ {money(monthly)}/month</div>
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
            <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const wasSaved = wish.has(g.id);
                const changed = wish.toggle(g.id);
                // never claim a save that did not happen (guests are gated)
                if (changed) toast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
              }}
              aria-pressed={wish.has(g.id)}
              aria-label={wish.has(g.id) ? "Remove from wishlist" : "Add to wishlist"}
              className={`rounded-full border p-2 transition-colors ${wish.has(g.id) ? "border-[#B07C28] bg-[#FBF5E7] text-[#B07C28]" : "border-line-strong text-ink3 hover:border-[#B07C28] hover:text-[#B07C28]"}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={wish.has(g.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
            </button>
              <a href={`#/g/${g.id}`} className="font-semibold text-primary hover:text-primary-dark">Details</a>
            </div>
          </div>
        </div>
      </div>
      {toastNode}
    </article>
  );
}

// Shared button base. transform + shadow transitions are here, not per-button:
// this constant is the ancestor of every CTA in the app, so colour-only
// transitions here made the whole product feel flat on hover.
export const btnCls = "rounded-lg px-7 py-2.5 text-base font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,34,0.14)] active:translate-y-0 active:scale-[0.98] active:duration-75";
export const btnPrimaryCls = btnCls + " bg-[#2563EB] text-white hover:bg-[#1D4ED8]";
export const btnOutlineCls = btnCls + " border border-[#C7C7CC] bg-white text-[#111827] hover:bg-[#F9FAFB]";
export const btnDangerCls = btnCls + " bg-[#B3372E] text-white hover:bg-[#93291F]";
export const fieldLabelCls = "block text-sm font-bold text-[#111827]";
export const fieldInputCls = "mt-2.5 w-full rounded-[10px] border border-[#C7C7CC] px-5 py-3.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";

/**
 * Password input with an accessible show/hide toggle. Hidden by default, and
 * the button is a real toggle (aria-pressed) so screen readers announce state.
 * One component for every auth field instead of five copies of the same markup.
 */
export function PasswordField({ id, value, onChange, autoComplete, minLength, placeholder, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-describedby={`${id}-toggle`}
        className={fieldInputCls + " pr-20"}
      />
      <button
        type="button"
        id={`${id}-toggle`}
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-controls={id}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-ink3 transition-colors hover:text-primary"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function Modal({ title, sub, children, actions, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    // a modal must own focus: move it in, trap Tab inside, restore it on close
    const previous = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      node ? [...node.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea, select')]
        .filter((el) => el.offsetParent !== null) : [];
    (focusables()[0] || node)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);
  return (
    <div className="anim-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(28,33,38,0.5)] p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialogRef} onClick={(e) => e.stopPropagation()} className="anim-scale-in max-h-[86vh] w-[min(520px,100%)] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <h3 className="text-[calc(22px*var(--tscale,1))] font-bold leading-snug text-[#111827]">{title}</h3>
        {sub && <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{sub}</p>}
        <div className="mt-6 space-y-5">{children}</div>
        <div className="mt-6 flex justify-end gap-2.5">{actions}</div>
      </div>
    </div>
  );
}

/* Honest "still loading" card. The catalog is fetched live per category, so
   there is a real gap between first paint and results: say so instead of
   letting pages show a false empty state ("no gadgets match"). */
export function CatalogLoadingCard({ bare = false }) {
  const card = (
      <div className="card max-w-xl p-8 text-center mx-auto">
        <h2 className="text-2xl">Loading products…</h2>
        <p className="mt-3 text-ink2">
          Fetching live marketplace listings. This takes a few seconds the first time;
          results are cached afterwards.
        </p>
        <div className="mx-auto mt-5 h-2 w-40 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
  );
  return bare ? card : <section className="section">{card}</section>;
}

/* Honest stale-snapshot notice: real marketplace rows fetched earlier, shown
   because the live provider is unavailable right now (e.g. quota exhausted). */
export function StaleCatalogNote() {
  const stale = typeof GW !== "undefined" && GW.catalogStale;
  if (!stale) return null;
  const when = GW.catalogStaleFrom
    ? ` from ${new Date(GW.catalogStaleFrom).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}`
    : "";
  return (
    <p className="mt-3 rounded-lg border border-[#F0E2B8] bg-[#FFF8E6] px-3 py-2 text-sm leading-relaxed text-[#6B4E12] [overflow-wrap:anywhere]">
      Live marketplace search is unavailable right now — these are real listings from the last successful fetch{when}, not new ones.
    </p>
  );
}

/* Honest "products unavailable" card. Shown when the live marketplace can't be
   reached — never replaced by fake product data. */
export function CatalogErrorCard({ bare = false }) {
  const card = (
      <div className="card max-w-xl p-8 text-center mx-auto">
        <h2 className="text-2xl">Couldn't load live products</h2>
        <p className="mt-3 text-ink2">
          GadgetWise pulls real listings from the marketplace and it looks like that
          request failed. Nothing here is being faked. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={btnPrimaryCls + " mt-5"}
        >
          Retry
        </button>
      </div>
  );
  return bare ? card : <section className="section">{card}</section>;
}

/* Shared sign-in prompt for guests who attempt an account-gated action
   (favorite, review, ...). Rendered once in App; every gated action routes
   through requireAuth() so the prompt and return-to stay consistent. */
export function AuthPromptHost() {
  const [prompt, close] = useAuthPrompt();
  const { pathname, search } = useLocation();
  if (!prompt) return null;
  const next = encodeURIComponent(pathname + search);
  return (
    <Modal
      title="Sign in to continue"
      sub={`You need an account to ${prompt.action}.`}
      onClose={close}
      actions={
        <>
          <button type="button" className={btnOutlineCls} onClick={close}>
            Not now
          </button>
          <Link to={`/login?next=${next}`} className={btnPrimaryCls} onClick={close}>
            Sign in
          </Link>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink2">
        Create a free account to save favourites, write reviews, and keep your
        comparisons across devices. Browsing, search, and recommendations stay
        open to everyone.
      </p>
      <Link to={`/register?next=${next}`} className="text-sm font-semibold text-[#2563EB]" onClick={close}>
        Create an account instead →
      </Link>
    </Modal>
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
  const timers = useRef(new Map());
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);
  const dismiss = (id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    // exit animation before unmount; reduced-motion users close immediately
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setItems((xs) => xs.filter((x) => x.id !== id));
      return;
    }
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 190);
  };
  const toast = (text, icon = "checkCircle") => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs.slice(-3), { id, text, icon }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 3200));
  };
  // Portal to <body>: the host must escape the route-fade stacking context on
  // main and the hover-transform containing block on cards, or the toast is
  // painted under modal scrims and anchored to a card instead of the viewport.
  // Render nothing when empty so 240 product cards don't mount 240 live regions.
  if (!items.length) return [toast, null];
  const node = (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[100] grid max-w-[min(24rem,calc(100vw-2rem))] gap-2.5 sm:right-6" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`${t.leaving ? "toast-out" : "toast-in"} flex min-w-0 items-start gap-2.5 rounded-2xl bg-[#0F1722] px-[18px] py-3 text-sm font-semibold text-white shadow-2xl`} role="alert">
          <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-[#9CC3EE]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{toastIco[t.icon] || toastIco.checkCircle}</svg>
          <span className="min-w-0 break-words">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="ml-auto shrink-0 text-white/60 transition-colors hover:text-white">×</button>
        </div>
      ))}
    </div>
  );
  return [toast, createPortal(node, document.body)];
}


/* ------------------------------------------------------------------ *
 * GadgetWise brand mark (cube + "smart pick" spark) and lockup.
 * One source of truth for every branded surface (header, footer, auth,
 * admin). Tone controls the wordmark contrast for light vs dark chrome.
 * ------------------------------------------------------------------ */
export function LogoMark({ size = 20, className = "" }) {
  // Original GadgetWise mark recovered from gadgetwise-prototype (js/app.js):
  // flat blue tile, white cube outline, three warm-gold interior rules.
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="25" height="25" rx="6" fill="#1D5BA4" />
      <path d="M14 6.5 7.5 10v8L14 21.5 20.5 18v-8L14 6.5Z" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 10v8M10.7 8.9v10.2M17.3 8.9v10.2" stroke="#D9A441" strokeWidth="1.4" />
    </svg>
  );
}

/** Mark + "GadgetWise" wordmark. tone="dark" for light chrome, "light" for dark. */
export function Logo({ size = 20, tone = "dark", showWordmark = true, className = "" }) {
  const primary = tone === "light" ? "text-white" : "text-[#111827]";
  const accent = tone === "light" ? "text-[#A9C4F5]" : "text-[#1D5BA4]";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* the mark carries its own tile, so no wrapper box */}
      <LogoMark size={size * 1.4} />
      {showWordmark && (
        <span className={`font-bold ${primary}`} style={{ fontSize: size * 1.05 }}>
          Gadget<span className={accent}>Wise</span>
        </span>
      )}
    </span>
  );
}


/**
 * Scroll reveal. Observes every `.reveal:not(.is-visible)` element, including
 * ones that mount later (catalog sections appear only after loading finishes).
 * Reveals are driven by live scroll position, so late-mounted content is
 * handled and nothing can be revealed before the reader actually reaches it.
 */
export function useReveal() {
  useEffect(() => {
    // mark the system ready so the hidden state is applied at all
    document.documentElement.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window)) {
      // no observer support: never leave content hidden
      document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-visible"));
      return;
    }

    // Position-truthful reveals. An IntersectionObserver reports its INITIAL
    // intersection state when it starts observing, and at mount the page is
    // still short (catalog sections arrive later) — so a section could be
    // revealed while briefly "in view", then pushed thousands of pixels down
    // and never animate when actually scrolled to. Checking live positions on
    // scroll + a slow tick is correct by construction and also picks up
    // content mounted later, so no MutationObserver is needed.
    const sweep = () => {
      // During initial load the page is still short (catalog sections arrive
      // later), so a section can sit inside the viewport and then be pushed
      // thousands of pixels down. Revealing it at that moment meant it never
      // animated when scrolled to — so anything the layout growth moved clearly
      // off-screen is re-armed while the reader has not scrolled yet.
      for (const e of document.querySelectorAll(".reveal")) {
        const r = e.getBoundingClientRect();
        const inView = r.top < window.innerHeight * 0.92 && r.bottom > 0;
        if (inView) e.classList.add("is-visible");
        else if (window.scrollY === 0 && r.top > window.innerHeight + 120) e.classList.remove("is-visible");
      }
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; sweep(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const t = setInterval(sweep, 1000);
    sweep();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearInterval(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}


/**
 * Auth screen shell: a brand panel (navy, the app's value props) beside the
 * form. One layout for Login + Register so they stay visually identical.
 * On mobile the brand panel hides and the form stands alone.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <section className="section">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(15,23,34,0.12)] lg:grid-cols-2">
        {/* brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-hero p-10 text-on-hero lg:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />
          <Logo size={20} tone="light" />
          <div className="relative">
            <h2 className="text-[2.15rem] font-extrabold leading-[1.1]">
              Find the right gadget for <span className="text-star">school.</span>
            </h2>
            <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-on-hero2">
              Compare verified specifications, monthly costs, and student priorities before you buy.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-on-hero2">
              {["Ownership cost on every tag", "Warranty & repair paths surfaced", "Scores show their math"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[11px]">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-on-hero2">Made for Filipino students · GadgetWise</p>
        </div>

        {/* form panel */}
        <div className="p-7 sm:p-10">
          <div className="mb-6 lg:hidden"><Logo size={20} tone="dark" /></div>
          <h1 className="text-[1.85rem] font-extrabold leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-ink2">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink2">{footer}</div>}
        </div>
      </div>
    </section>
  );
}
