import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { GW, money, ownIndex, enrich } from "../lib.js";
import { useAuth, requireAuth } from "../lib/auth.js";
import { submitReview as submitReviewRecord, loadReviews, trackView } from "../lib/store.js";
import { isListingId, fetchListing } from "../lib/marketplace.js";
import {
  Img,
  Stars,
  StarPicker,
  ReviewVotes,
  Bar,
  GadgetCard,
  useWishlist,
  Modal,
  useToast,
  btnPrimaryCls,
  btnOutlineCls,
  fieldLabelCls,
  fieldInputCls,
  HeartIcon, ScaleIcon, focusField, FieldError,
} from "../components/ui.jsx";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);


function MiniStars({ n }) {
  return (
    <span className="text-star" aria-label={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="text-line-strong">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/* Monthly cost of every gadget in a category, cheapest first. Listings with an
   unknown price are skipped: they cannot be compared by cost. */
function CategoryCostList({ catId }) {
  const rows = GW.gadgetsInCategory(catId)
    .filter((x) => typeof x.price === "number" && Number.isFinite(x.price) && x.price > 0)
    .map((x) => ({ x, m: x.price / GW.MONTHS_WINDOW }))
    .sort((a, b) => a.m - b.m);
  if (!rows.length) {
    return <p className="text-sm text-ink2">No priced gadgets in this category yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.m));
  return (
    <>
      <p className="text-sm text-ink2">
        Cost per month among {GW.getCategory(catId).name.toLowerCase()} in the catalog:
      </p>
      <ul className="mt-3 space-y-2.5">
        {rows.map(({ x, m }) => (
          <li key={x.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink2">{GW.displayName(x)}</span>
              <span className="mono shrink-0 font-semibold text-ink">{money(m)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (m / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink3">Lower bar = cheaper to own per month.</p>
    </>
  );
}

/* Collapsible block with the frame's light-blue header + chevron
   ("How this estimate is calculated" ships open, "Specifications" closed). */
function Disclose({ title, open = false, children }) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 bg-primary-wash px-5 py-4 text-left"
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <svg
          className={`h-4 w-4 shrink-0 text-primary-dark transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  );
}

/* Spec chips + spec table (frame rows: Chipset / Memory / Display / Battery / Weight). */
function SpecPanel({ g }) {
  const entries = Object.entries(g.specs || {});
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([k, v]) => (
          <span key={k} className="chip-neutral w-full">
            <span>
              <b className="text-ink">{k}</b> {v}
            </span>
          </span>
        ))}
      </div>
      <dl className="mt-5">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-6 border-b border-line py-2.5 text-sm last:border-0"
          >
            <dt className="text-ink2">{k}</dt>
            <dd className="text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function GadgetDetail({ compare, onCompare }) {
  const { user } = useAuth();
  const uid = user?.id || user?.email || null;
  const { id } = useParams();
  const [tab, setTab] = useState("ownership-cost");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rvErr, setRvErr] = useState("");
  const [toast, toastNode] = useToast();
  const wish = useWishlist();
  // the listing lookup has three honest states - found, not-found (the
  // listing is really gone) and error (the lookup failed and can be retried).
  // A failed lookup must never be reported as "not found".
  // every per-product value is stored WITH its id, and only used when
  // the id still matches. An effect runs after the render, so resetting state
  // inside one would still show the previous product for a frame.
  const [loaded, setLoaded] = useState({ id: null, gadget: null, extra: [], reviewsLoaded: false });
  const [listing, setListing] = useState({ id: null, status: "idle", error: null });
  const [retryTick, setRetryTick] = useState(0);
  // Real view tracking for admin analytics (fire-and-forget, never blocks UI).
  useEffect(() => {
    trackView(id);
  }, [id]);

  useEffect(() => {
    if (!isListingId(id)) return;
    let cancelled = false;
    setListing({ id, status: "loading", error: null });
    fetchListing(id).then((res) => {
      if (cancelled) return;
      // guard against a late response for a previous id
      if (res?.gadget && res.gadget.id !== id) return;
      if (res?.status === "found") {
        setLoaded((s) => ({ ...s, id, gadget: res.gadget }));
        setListing({ id, status: "found", error: null });
      } else if (res?.status === "not-found") {
        setLoaded((s) => ({ ...s, id, gadget: null }));
        setListing({ id, status: "not-found", error: null });
      } else {
        setLoaded((s) => ({ ...s, id, gadget: null }));
        setListing({ id, status: "error", error: res?.error || "The marketplace lookup failed. Please try again." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, retryTick]);
  // Load real reviews for this product (public + own; RLS enforces visibility).
  useEffect(() => {
    let cancelled = false;
    loadReviews(id).then((rows) => {
      // the id is written with the rows: state for another product can never
      // be read back under this one
      if (!cancelled && rows) setLoaded((s) => ({ id, extra: rows, reviewsLoaded: true, gadget: s.gadget }));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  // Only the state that belongs to THIS id may render.
  const fetched = loaded.id === id ? loaded.gadget : null;
  const extra = loaded.id === id ? loaded.extra : [];
  const reviewsLoaded = loaded.id === id ? loaded.reviewsLoaded : false;
  const listingState = listing.id === id ? listing : { status: isListingId(id) ? "loading" : "idle", error: null };
  const g = GW.getGadget(id) || fetched;
  if (!g && listingState.status === "loading") {
    return (
      <section className="section">
        <h1>Loading…</h1>
      </section>
    );
  }
  // a failed lookup is an error with a retry, not a "not found" claim.
  if (!g && listingState.status === "error") {
    return (
      <section className="section">
        <h1>Could not load this listing</h1>
        <p className="mt-3 text-ink2">{listingState.error}</p>
        <p className="mt-2 text-sm text-ink3">
          The marketplace may be busy or temporarily unavailable. The listing may still exist.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className={btnPrimaryCls + " inline-flex"}
          >
            Try again
          </button>
          <Link to="/gadgets" className={btnOutlineCls + " inline-flex"}>
            Back to catalog
          </Link>
        </div>
      </section>
    );
  }
  if (!g) {
    return (
      <section className="section">
        <h1>Gadget not found</h1>
        <p className="mt-3 text-ink2">
          This gadget is not in the catalog. Marketplace listings can also disappear when the seller removes them.
        </p>
        <Link to="/gadgets" className={btnPrimaryCls + " mt-4"}>
          Back to catalog
        </Link>
      </section>
    );
  }

  // an unknown price is unavailable, not ₱0. Every price-derived
  // number below is suppressed rather than shown as zero.
  const priceKnown = typeof g.price === "number" && Number.isFinite(g.price) && g.price > 0;
  const monthly = priceKnown ? g.price / GW.MONTHS_WINDOW : null;
  const name = GW.displayName(g);
  const cat = GW.getCategory(g.category);
  const catName = cat ? cat.name : g.category;
  const wYears = g.value.warrantyYears;
  const issues = g.issues || [];
  const reviews = [...extra, ...(g.reviews || [])];
  const specEntries = Object.entries(g.specs || {});
  // Hero description = tagline + summary as one paragraph (frame copy).
  const desc = [
    g.tagline && (/[.!?…]$/.test(g.tagline) ? g.tagline : `${g.tagline}.`),
    g.summary,
  ]
    .filter(Boolean)
    .join(" ");

  // Ownership cost numbers (same 36-month formula everywhere).
  const over1 = monthly == null ? "N/A" : money(monthly * 12);
  const over3 = priceKnown ? money(g.price) : "Unavailable";
  const coverPct = wYears == null ? null : Math.round((wYears / (GW.MONTHS_WINDOW / 12)) * 100);
  const costScore = (() => {
    if (monthly == null) return "N/A";
    const ms = GW.gadgetsInCategory(g.category)
      .map((x) => (typeof x.price === "number" && Number.isFinite(x.price) ? x.price / GW.MONTHS_WINDOW : null))
      .filter((v) => v != null);
    if (!ms.length) return "N/A";
    const lo = Math.min(...ms);
    const hi = Math.max(...ms);
    return hi === lo ? "10.0" : (10 * (1 - (monthly - lo) / (hi - lo))).toFixed(1);
  })();

  // 0–5 ownership scores from catalog values (frame: "Battery (spec)" 5.0, "Warranty (catalog)" 2.5).
  const s5 = (v01) => Math.min(5, v01 * 5).toFixed(1);
  // null stays null (Bar renders "Not available"); never coerce a missing spec to 0.
  const ownBars = [
    ["Battery (spec)", g.scored.battery == null ? null : s5(Math.min(g.scored.battery / 10, 1))],
    ["Warranty (catalog)", wYears == null ? null : s5(Math.min((wYears * 12) / 24, 1))],
  ];

  const submitReview = async () => {
    if (!requireAuth("write a review")) return;
    if (submitting) return; // one click, one review row
    if (!text.trim()) { setRvErr("Your review cannot be empty."); focusField("#rv-text"); return; }
    setSubmitting(true);
    const res = await submitReviewRecord(uid, {
      gadget_id: g.id,
      rating,
      body: text.trim(),
    });
    setSubmitting(false);
    setReviewOpen(false);
    if (!res.ok) {
      // keep the draft: a rejected review should be correctable, not retyped
      setReviewOpen(true);
      toast("Could not save review: " + res.error, "alert");
      return;
    }
    setText("");
    setRating(5);
    toast(
      res.local
        ? "Review saved locally (sign in to sync across devices)."
        : "Review published. It's live on this page."
    );
    // Refresh the list so the author sees their own review immediately.
    loadReviews(g.id).then((rows) => {
      if (rows) setLoaded((s) => ({ ...s, id, extra: rows, reviewsLoaded: true }));
    });
  };

  const rowCls = "flex items-baseline justify-between gap-6 border-b border-line py-2.5 text-sm last:border-0";

  return (
    <section className="section">
      <nav className="text-sm text-ink3" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>
        {" / "}
        <Link to="/gadgets" className="hover:text-primary">
          Gadgets
        </Link>
        {" / "}
        <Link to={`/gadgets?cat=${g.category}`} className="hover:text-primary">
          {catName}
        </Link>
        {" / "}
        <span className="text-ink2">{g.model}</span>
      </nav>

      {/* Hero: frame puts the image + actions left and the meta → common-issue stack right. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="anim-in min-w-0 lg:sticky lg:top-24 lg:self-start" style={{ "--i": 0 }}>
          <Img gadget={g} className="card hover-lift card-media" eager />
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                const wasSaved = wish.has(g.id);
                const res = await wish.toggle(g.id);
                if (res && res.gated) return; // auth prompt shown; nothing changed
                if (res && res.ok === false) toast("Saved on this device, but could not sync to your account.", "alert");
                else toast(wasSaved ? "Removed from wishlist" : "Added to wishlist");
              }}
              aria-pressed={wish.has(g.id)}
              className={(wish.has(g.id) ? btnPrimaryCls : btnOutlineCls) + " inline-flex items-center gap-2"}
            >
              <HeartIcon className="h-4 w-4" />
              {wish.has(g.id) ? "In your Wishlist" : "Add to Wishlist"}
            </button>
            <button
              type="button"
              onClick={() => onCompare(g.id)}
              aria-pressed={compare.has(g.id)}
              className={(compare.has(g.id) ? btnPrimaryCls : btnOutlineCls) + " inline-flex items-center gap-2"}
            >
              <ScaleIcon className="h-4 w-4" />
              {compare.has(g.id) ? "In Compare" : "Add to Compare"}
            </button>
            <button type="button" onClick={() => requireAuth("write a review") && setReviewOpen(true)} className={btnPrimaryCls}>
              Write Review
            </button>
            {g.productUrl && (
              <a
                href={g.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnOutlineCls}
              >
                View on Lazada ↗
              </a>
            )}
          </div>
        </div>

        <div className="anim-in min-w-0" style={{ "--i": 1 }}>
          <div className="text-xs font-semibold tracking-[0.18em] text-ink3">
            {g.brand && g.brand !== "Unknown" ? `${g.brand} · ` : ""}{catName}
            {g.releaseYear ? ` · ${g.releaseYear}` : ""}
            {g.marketplace && (
              <span className="ml-2 rounded-full border border-[#C7C7CC] bg-[#F9FAFB] px-2 py-0.5 text-[0.65rem] font-semibold tracking-normal text-ink2">
                Live marketplace listing
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <h1 className="text-3xl sm:text-4xl">{g.model}</h1>
            <div className="sm:text-right">
              <div className="mono text-3xl font-semibold text-primary-dark sm:text-4xl">
                {priceKnown ? money(g.price) : "Price unavailable"}
              </div>
              <div className="mono mt-1 text-sm font-semibold text-ink">
                {monthly == null ? "Cost per month unavailable" : `PER MONTH ≈ ${money(monthly)}/month`}
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-ink3">
            Price spread over a 36-month window. Not a selling price.
          </p>
          <p className="mt-4 text-ink2">{desc}</p>
          <div className="mt-4">
            <Stars rating={g.rating} count={g.reviewCount} />
          </div>

          {/* Ownership value tag */}
          <div className="card mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Ownership value tag</h2>
              <span className="chip-tag">{catName}</span>
            </div>
            <dl className="mt-3">
              <div className={rowCls}>
                <dt className="text-ink2">Price</dt>
                <dd className="mono font-semibold text-ink">{priceKnown ? money(g.price) : "Unavailable"}</dd>
              </div>
              <div className={rowCls}>
                <dt className="text-ink2">Warranty</dt>
                <dd className="font-semibold text-ink">
                  {wYears == null ? "Not specified" : `${wYears} year${wYears === 1 ? "" : "s"}`}
                </dd>
              </div>
              <div className={rowCls}>
                <dt className="text-ink2">Repair path</dt>
                <dd className="text-right font-semibold text-ink">{g.value.repairabilityLabel}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 rounded-sm bg-primary-soft px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink3">
                Per Month
              </span>
              <span className="mono text-lg font-semibold text-ink">
                {monthly == null ? "Unavailable" : `${money(monthly)} /month`}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink3">
              Estimate only. Price spread over a fixed 36-month usage window. The same assumption for every gadget, so numbers stay comparable.
            </p>
          </div>

          {/* How this estimate is calculated (frame: expanded, chevron header) */}
          <div className="mt-6">
            <Disclose title="How this estimate is calculated" open>
              <div className="rounded-sm border border-dashed border-line-strong bg-surface2 p-4 text-center text-xs break-words sm:text-sm">
                <div className="text-ink2">Cost per month =</div>
                <div className="mono mt-1 text-ink">Product Price ÷ 36-month usage window</div>
                {monthly == null ? (
                  <div className="mono mt-1 text-ink">Price unavailable. This listing has no price</div>
                ) : (
                  <>
                    <div className="mono mt-1 text-ink">{money(g.price)} ÷ 36 =</div>
                    <div className="mono mt-1 font-semibold text-primary-dark">
                      ≈ {money(monthly)} per month
                    </div>
                  </>
                )}
              </div>
              <p className="mt-3 text-sm text-ink2">
                A single transparent formula: the same one used across every gadget, so numbers can be compared fairly. The production system may extend this with electricity, insurance, or repair-cost data.
              </p>
            </Disclose>
          </div>

          {/* Pros & cons chips (frame: green positives, red trade-offs) */}
          <section className="mt-8">
            <h2 className="sr-only">Pros &amp; cons</h2>
            <div className="flex flex-wrap gap-2">
              {(g.strengths || []).map((s) => (
                <span key={s} className="chip-good">
                  {s}
                </span>
              ))}
              {(g.weaknesses || []).map((w) => (
                <span key={w} className="chip-bad">
                  {w}
                </span>
              ))}
            </div>
          </section>

          {/* Good for / Not ideal for (hidden entirely when there is nothing to say) */}
          {(g.goodFor?.length || g.notIdeal?.length) ? (
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Good for</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink2">
                {(g.goodFor || []).map((x) => (
                  <li key={x}>✓ {x}</li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Not ideal for</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink2">
                {(g.notIdeal || []).map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            </div>
          </section>
          ) : null}

          {/* Specifications (frame: collapsed accordion) */}
          <div className="mt-8">
            <Disclose title="Warranty & repair">
              {/* specs live in the Specifications tab; this accordion is warranty only */}
              <div className="card mt-6 p-6">
                <dl className="mt-4">
                  <div className={rowCls}>
                    <dt className="text-ink2">Warranty</dt>
                    <dd className="font-semibold text-ink">
                      {wYears == null ? "Not specified" : `${wYears} year${wYears === 1 ? "" : "s"}`}
                    </dd>
                  </div>
                  <div className={rowCls}>
                    <dt className="text-ink2">Expected lifespan</dt>
                    <dd className="font-semibold text-ink">{g.value.lifespanYears} years</dd>
                  </div>
                  <div className={rowCls}>
                    <dt className="text-ink2">Repair path</dt>
                    <dd className="text-right font-semibold text-ink">{g.value.repairabilityLabel}</dd>
                  </div>
                </dl>
                {(g.durab != null || g.repair != null) && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {g.durab != null && <Bar label="Durability (editorial)" v={g.durab} max={5} mono />}
                    {g.repair != null && <Bar label="Repairability (editorial)" v={g.repair} max={5} mono />}
                  </div>
                )}
              </div>
            </Disclose>
          </div>

          {/* Ownership scores */}
          <div className="card mt-8 p-6">
            <h2 className="text-xl font-semibold">Ownership scores</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {ownBars.map(([label, v]) => (
                <Bar key={label} label={label} v={v} max={5} mono />
              ))}
            </div>
            <p className="mt-4 text-xs text-ink3">
              Derived from catalog specs. The full formula is in the README.
            </p>
          </div>

          {/* Evidence-backed metrics - derived from the listing's real fields,
              each labeled with provenance. No value is invented. */}
          <div className="card mt-8 p-6">
            <h2 className="text-xl font-semibold">Evidence-backed metrics</h2>
            <p className="mt-1 text-sm text-ink2">
              Computed from this listing's real data. Every value is labeled source, calculated, estimated, or unavailable.
            </p>
            <dl className="mt-4 divide-y divide-line">
              {enrich(g).map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <dt className="font-medium text-ink">{m.label}</dt>
                    <dd className="text-xs text-ink3">{m.method || m.reason}{m.note ? ` · ${m.note}` : ""}</dd>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mono text-lg font-semibold text-ink">
                      {m.value == null ? "N/A" : `${m.value}${m.unit === "%" ? "%" : m.unit === "/5" ? "/5" : m.unit === "/100" ? "/100" : ` ${m.unit}`}`}
                    </div>
                    <span className={
                      "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium " +
                      (m.status === "source" ? "bg-emerald-100 text-emerald-800"
                        : m.status === "calculated" ? "bg-blue-100 text-blue-800"
                        : m.status === "estimated" ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600")
                    }>{m.status}</span>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* Common issue banner (frame: warm/yellow) */}
          <section className="mt-8">
            <h2 className="sr-only">Common issues</h2>
            {g.issue && (
              <div className="rounded-sm border border-line-strong bg-warm-soft px-4 py-3 text-sm font-medium break-words text-warm-dark">
                Common issue: {g.issue}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Tab bar - only the active panel renders (frame default: Ownership Cost). */}
      <nav
        className="mt-12 flex flex-wrap gap-1 border-y border-line py-2"
        role="tablist"
        aria-label="Product details"
      >
        {[
          ["Specifications", "specifications"],
          ["Value Analysis", "value-analysis"],
          ["Ownership Cost", "ownership-cost"],
          [`Reviews${reviewsLoaded ? ` (${reviews.length})` : ""}`, "reviews"],
          [`Reported Issues (${issues.length})`, "reported-issues"],
        ].map(([label, target]) => (
          <button
            key={target}
            type="button"
            role="tab"
            aria-selected={tab === target}
            aria-controls={`panel-${target}`}
            onClick={() => setTab(target)}
            className={`rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm ${
              tab === target
                ? "border-b-2 border-primary text-primary-dark"
                : "text-ink3 hover:bg-primary-wash hover:text-primary-dark"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div id={`panel-${tab}`} role="tabpanel" className="mt-8">
        {tab === "specifications" && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Specifications</h2>
            <div className="mt-4">
              <SpecPanel g={g} />
            </div>
          </div>
        )}

        {tab === "value-analysis" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Value analysis</h2>
              <dl className="mt-4">
                <div className={rowCls}>
                  <dt className="text-ink2">Performance</dt>
                  <dd className="mono font-semibold text-ink">{g.scored.performance == null ? "N/A" : `${g.scored.performance.toFixed(1)}/10`}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Battery</dt>
                  <dd className="mono font-semibold text-ink">{g.scored.battery == null ? "N/A" : `${g.scored.battery.toFixed(1)}/10`}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Portability</dt>
                  <dd className="mono font-semibold text-ink">{g.scored.portability == null ? "N/A" : `${g.scored.portability.toFixed(1)}/10`}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Warranty</dt>
                  <dd className="font-semibold text-ink">{wYears == null ? "N/A" : `${wYears} yr`}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Cost per month</dt>
                  <dd className="mono font-semibold text-ink">{costScore}/10</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-ink2">
                Scores are 0–10 catalog ratings, normalized against {catName.toLowerCase()} in this catalog. Warranty is a catalog fact.
              </p>
            </div>
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Category context</h2>
              <h3 className="mt-5 font-semibold">Why these numbers?</h3>
              <p className="mt-2 text-sm text-ink2">
                Performance, battery, and portability are GadgetWise catalog ratings normalized within the category; warranty is a catalog fact; student rating comes from GadgetWise users. Cost per month and the Performance to Cost index are deterministic formulas over these values. No metric here is inferred beyond the published formulas.
              </p>
            </div>
          </div>
        )}

        {tab === "ownership-cost" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Cost per month</h2>
              <div className="mt-4 rounded-sm border border-dashed border-line-strong p-4 text-center text-xs break-words sm:text-sm">
                <div className="text-ink2">Price ÷ 36-month window</div>
                {monthly == null ? (
                  <div className="mono mt-1 text-ink">Price unavailable</div>
                ) : (
                  <>
                    <div className="mono mt-1 text-ink">{money(g.price)} ÷ 36</div>
                    <div className="mono mt-1 font-semibold text-primary-dark">≈ {money(monthly)} / month</div>
                  </>
                )}
              </div>
              <dl className="mt-3">
                <div className={rowCls}>
                  <dt className="text-ink2">Over 1 year</dt>
                  <dd className="mono font-semibold text-ink">{over1}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Over 3 years (window)</dt>
                  <dd className="mono font-semibold text-ink">{over3}</dd>
                </div>
                <div className={rowCls}>
                  <dt className="text-ink2">Warranty coverage</dt>
                  <dd className="font-semibold text-ink">
                    {wYears == null ? "Not specified for marketplace listings" : `${wYears} yr. ${coverPct}% of the window`}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="card p-6">
              <h2 className="text-xl font-semibold">Against its category</h2>
              <div className="mt-3">
                <CategoryCostList catId={g.category} />
              </div>
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <section>
            <h2 className="text-xl font-semibold">Student reviews</h2>
            <div className="mt-4 grid gap-8 lg:grid-cols-2">
              {(() => {
                // Real stats computed from the loaded GadgetWise reviews (not the
                // marketplace rating) so the summary always matches the list below.
                const n = reviews.length;
                const avg = n ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / n : null;
                const dist = [5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
                  return { star, count, pct: n ? Math.round((count / n) * 100) : 0 };
                });
                return (
                  <>
                    <div className="card p-6">
                      <div className="mono text-4xl font-semibold text-primary-dark">
                        {avg == null ? "N/A" : avg.toFixed(1)}
                      </div>
                      <div className="mt-2 text-ink2">
                        {n} student review{n === 1 ? "" : "s"}
                        {n ? " · average rating" : " · no reviews yet"}
                      </div>
                    </div>
                    <div className="card p-6">
                      <p className="text-sm text-ink2">
                        {n ? "Rating distribution from the reviews below" : "No ratings yet"}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {dist.map((d) => (
                          <li key={d.star} className="flex items-baseline justify-between text-sm">
                            <span className="text-ink2">{d.star}★</span>
                            <span className="mono font-semibold text-ink">{n ? `${d.count} · ${d.pct}%` : "N/A"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="mt-6 space-y-4">
              {reviews.map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark">
                      {initials(r.user)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <div>
                          <div className="font-semibold">
                            {r.user_id ? (
                              <Link to={`/u/${r.user_id}`} className="hover:text-primary hover:underline">
                                {r.user}
                              </Link>
                            ) : (
                              r.user
                            )}
                          </div>
                          {r.context && <div className="text-xs text-ink3">{r.context}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <MiniStars n={r.rating} />
                          {r.date && <div className="text-xs text-ink3">{fmtDate(r.date)}</div>}
                        </div>
                      </div>
                      <p className="mt-2 text-ink2">{r.text}</p>
                      <div className="mt-3">
                        <ReviewVotes review={r} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => requireAuth("write a review") && setReviewOpen(true)} className={btnPrimaryCls}>
                Write a review
              </button>
              <span className="text-sm text-ink3">
                Showing {reviews.length} of {reviews.length}
              </span>
            </div>
          </section>
        )}

        {tab === "reported-issues" && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Reported Issues ({issues.length})</h2>
            <ul className="mt-3 divide-y divide-line">
              {issues.map((i) => (
                <li key={i.id} className="py-3 text-sm">
                  <div className="font-semibold text-ink">{i.title}</div>
                  <div className="mt-1 text-xs text-ink3">
                    {[i.reportedBy, i.date && fmtDate(i.date), i.status, i.severity]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </li>
              ))}
              {!issues.length && <li className="py-3 text-sm text-ink3">No reported issues.</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Similar in category */}
      <section id="similar" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Similar in this category</h2>
          <Link
            to={`/gadgets?cat=${g.category}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            See all in category
          </Link>
        </div>
        <div className="stagger mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GW.gadgetsInCategory(g.category)
            .filter((x) => x.id !== g.id)
            .slice(0, 3)
            .map((x, i) => (
              <GadgetCard key={x.id} i={i} g={x} compare={compare} onCompare={onCompare} />
            ))}
        </div>
      </section>

      {reviewOpen && (
        <Modal
          title="Write a review"
          sub="Reviews go to the moderation queue before appearing publicly."
          onClose={() => setReviewOpen(false)}
          actions={
            <>
              <button type="button" className={btnOutlineCls} onClick={() => setReviewOpen(false)}>
                Cancel
              </button>
              <button type="button" className={btnPrimaryCls} onClick={submitReview} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit for moderation"}
              </button>
            </>
          }
        >
          <div>
            <label className={fieldLabelCls} htmlFor="rv-rating">
              Rating
            </label>
            <StarPicker id="rv-rating" value={rating} onChange={setRating} label="Star rating" />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="rv-text">
              Your review
            </label>
            <textarea
              id="rv-text"
              rows={4}
              className={fieldInputCls}
              placeholder="How has it held up for schoolwork? Battery? Durability?"
              value={text}
              onChange={(e) => { setText(e.target.value); setRvErr(""); }}
              aria-invalid={rvErr ? "true" : undefined}
              aria-describedby={rvErr ? "rv-text-error" : undefined}
            />
            {rvErr && <FieldError id="rv-text">{rvErr}</FieldError>}
          </div>
        </Modal>
      )}
      {toastNode}
    </section>
  );
}

export default GadgetDetail;

