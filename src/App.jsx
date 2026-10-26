import { lazy, Suspense, useState } from "react";
import { GW, money } from "./lib.js";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
// ponytail: Home eager (landing must paint immediately), every other route lazy
const Catalog = lazy(() => import("./pages/Catalog.jsx"));
const GadgetDetail = lazy(() => import("./pages/GadgetDetail.jsx"));
const Compare = lazy(() => import("./pages/Compare.jsx"));
const Quiz = lazy(() => import("./pages/Quiz.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const ComparisonHistory = lazy(() => import("./pages/ComparisonHistory.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const ReviewHistory = lazy(() => import("./pages/ReviewHistory.jsx"));
const PublicProfile = lazy(() => import("./pages/PublicProfile.jsx"));
import Home from "./pages/Home.jsx";
import { useAuth, recoveryFlowActive } from "./lib/auth.js";
import { loadCatalog, loadCurated } from "./lib/catalog.js";
import { loadMyProfile } from "./lib/store.js";
import { Logo, btnPrimaryCls, AuthPromptHost, CatalogErrorCard, useReveal, ConfirmDialog, ErrorBoundary, useToast, HeartIcon, ScaleIcon } from "./components/ui.jsx";
import { createPortal } from "react-dom";

const NAV = [
  ["/", "Home"],
  ["/gadgets", "Gadgets"],
  ["/compare", "Compare"],
  ["/recommend", "Recommendations"],
];

// footer link columns - strings verbatim from the frame spec
const CATEGORIES = [
  ["All Gadgets", "/gadgets"],
  ["Smartphones", "/gadgets?cat=smartphones"],
  ["Laptops", "/gadgets?cat=laptops"],
  ["Tablets", "/gadgets?cat=tablets"],
  ["Headphones", "/gadgets?cat=headphones"],
  ["Power Banks", "/gadgets?cat=powerbanks"],
  ["Smartwatches", "/gadgets?cat=smartwatches"],
];
const DECIDE = [
  ["Get Recommendations", "/recommend"],
  ["Compare Gadgets", "/compare"],
  ["Wishlist", "/wishlist"],
  ["Comparison History", "/compare-history"],
];
const ACCOUNT = [
  ["Profile", "/profile"],
  ["Review History", "/review-history"],
  ["Log in", "/login"],
  ["Create account", "/register"],
];
const THIS_PROJECT = [
  "Compare real gadgets side by side",
  "Every score shows its math",
  "Not a store. Nothing is sold here",
];

// scroll back to the top whenever the route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// Navbar icons live in ui.jsx so the action buttons can reuse them.

function FooterColumn({ title, items, links }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links
          ? items.map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="text-on-hero2 hover:text-white">
                  {label}
                </Link>
              </li>
            ))
          : items.map((label) => (
              <li key={label} className="text-on-hero2">
                {label}
              </li>
            ))}
      </ul>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  // one reveal + entrance-wave system for the whole app (every route), not a
  // per-page hook: without it non-home routes run entrance animations at mount
  // time, where half of them play off-screen and never get seen
  useReveal();
  // The tray survives a refresh: same key the Compare page treats as its
  // saved selection, so both surfaces share one source of truth.
  const [compare, setCompare] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("gw_compare_selection") || "[]")); } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem("gw_compare_selection", JSON.stringify([...compare])); } catch { /* storage full/blocked: the tray still works in-memory */ }
  }, [compare]);
  // Real catalog load. Every product page reads the GW.gadgets global, so we
  // fill it before the routes render and force one re-render when it's ready.
  const [, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  // The catalog settled but has zero products. That is NOT a filter miss and
  // NOT a load failure - it is its own state, and saying "no gadgets match
  // your filters" for it is a lie (the user set no filters).
  const [catalogEmpty, setCatalogEmpty] = useState(false);
  // true until the live catalog has settled: pages must show "loading", never a
  // false empty state like "no gadgets match" while results are still arriving.
  const [catalogLoading, setCatalogLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    // Marketplace + admin-curated products load INDEPENDENTLY: curated (DB)
    // products must appear even when the marketplace API is down/quota-limited.
    (async () => {
      let catOk = true;
      try {
        const r = await loadCatalog();
        catOk = !!r?.ok;
      } catch {
        catOk = false;
      }
      await loadCurated().catch(() => {});
      if (!alive) return;
      // If we have anything (marketplace or curated), show it; only error when empty.
      if (GW.gadgets.length) setCatalogReady(true);
      else {
        // A successful-but-empty fetch is its own state, not a filter miss.
        setCatalogEmpty(catOk);
        setCatalogError(catOk ? null : "catalog unavailable");
      }
      setCatalogLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);
  const [q, setQ] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const searchRef = useRef(null);
  // close the suggestions when a click/tap lands outside the search box; a
  // blur-based hide raced real clicks and unmounted rows mid-click
  useEffect(() => {
    if (!showSuggest) return undefined;
    const close = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggest(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [showSuggest]);
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");
  // Auth and account routes need no product data - keep them reachable even if
  // the marketplace is down, so a visitor can always sign in. Only the
  // product-discovery routes show the catalog error state.
  // /admin is excluded too: the admin console must always render (its route
  // guard redirects non-admins, and its moderation/users panels work without the
  // marketplace). Only product-discovery routes are gated on the catalog.
  const needsCatalog = ![ "/", "/login", "/register", "/reset-password", "/profile", "/wishlist", "/review-history", "/compare-history", "/admin", "/recommend", "/compare", "/gadgets" ].includes(pathname)
    && !pathname.startsWith("/u/");
  const { user, ready, admin: isAdminUser, adminChecked, signOut, recovery } = useAuth();
  // Sign-out is consequential: confirm first, await the real result, and only
  // then leave. A failed logout must NOT look like a successful one.
  const [confirmOut, setConfirmOut] = useState(false);
  const [toast, toastNode] = useToast();
  const [outBusy, setOutBusy] = useState(false);
  const [outError, setOutError] = useState(null);
  const doSignOut = async () => {
    setOutBusy(true); setOutError(null);
    const res = await Promise.resolve(signOut()).catch((e) => ({ error: e }));
    if (res && res.error) {
      setOutError("Could not sign out. Please try again.");
      setOutBusy(false);
      return;
    }
    setOutBusy(false);
    setConfirmOut(false);
    navigate("/");
  };
  // A recovery session is not a normal signed-in session: the user still has to
  // choose a new password. While one is live, no other route (and no automatic
  // redirect) may take them away from the recovery page.
  // recoveryFlowActive() reads the persisted stage too, so the guard still
  // holds right after a refresh (the auth client restores the session with
  // SIGNED_IN, not PASSWORD_RECOVERY, so the event alone is not enough).
  const [flowActive, setFlowActive] = useState(() => recoveryFlowActive());
  useEffect(() => {
    const sync = () => setFlowActive(recoveryFlowActive());
    sync();
    window.addEventListener("gw-recovery-changed", sync);
    return () => window.removeEventListener("gw-recovery-changed", sync);
  }, []);
  const inRecovery = flowActive || recovery || pathname === "/reset-password";
  // the account avatar in the nav: one profile read per signed-in user
  const [navAvatar, setNavAvatar] = useState(null);
  const navUserId = user?.id || null;
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadMyProfile(navUserId).then((p) => { if (alive) setNavAvatar(p?.avatar_url || null); });
    };
    if (!navUserId) { setNavAvatar(null); return () => { alive = false; }; }
    refresh();
    // Profile saves dispatch this so the nav avatar updates immediately
    window.addEventListener("gw-profile-updated", refresh);
    return () => {
      alive = false;
      window.removeEventListener("gw-profile-updated", refresh);
    };
  }, [navUserId]);
  // Real identity for the navbar avatar (no hardcoded initials).
  const authName = user?.user_metadata?.full_name || user?.email || "";
  const authInitials = (authName || "?").trim().slice(0, 2).toUpperCase();

  const onCompare = (id) =>
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= 4) return prev; // max 4 gadgets in compare
      else next.add(id);
      return next;
    });
  // ponytail: the cap check is done on current state for a toast; the updater
  // still guards against double-click staleness.
  const onCompareWithFeedback = (id) => {
    if (!compare.has(id) && compare.size >= 4) {
      toast("Compare holds 4 gadgets. Remove one to add another.", "alert");
      return;
    }
    onCompare(id);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isAdminRoute && (
      <header className="site-header sticky top-0 z-20 border-b border-[#E7DFCF] bg-[#FBFAF6] shadow-[0_1px_0_rgba(217,164,65,0.25)]">
        <div className="mx-auto flex max-w-none flex-wrap items-center gap-x-4 gap-y-3 px-6 lg:flex-nowrap lg:px-12 2xl:px-16 py-4">
          {/* logo */}
          <Link to="/" className="order-1 flex min-w-0 shrink-0 items-center gap-2">
            <Logo size={20} tone="dark" />
            <span className="hidden text-sm font-normal text-ink3 2xl:inline">Smart picks for students</span>
          </Link>

          {/* right cluster: wishlist, compare, divider, avatar */}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-1 lg:order-4 lg:ml-0">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="rounded-lg p-1.5 text-ink2 hover:text-[#2563EB] sm:p-2"
            >
              <HeartIcon />
            </Link>
            <Link
              to="/compare"
              aria-label="Compare gadgets"
              className="rounded-lg p-1.5 text-ink2 hover:text-[#2563EB] sm:p-2"
            >
              <ScaleIcon />
            </Link>
            {isAdminUser && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                title="Open the admin console"
                className="ml-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-ink2 hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                Admin
              </button>
            )}
            <span className="mx-2 h-6 w-px bg-line-strong" aria-hidden="true" />
            {!ready ? null : user ? (
              // Signed in: real initials, role, and a sign-out affordance.
              <div className="flex items-center gap-1">
                {/* role already reads from the Admin button; a second badge was
                    duplicate chrome that crowded the mobile header */}
                <Link
                  to="/profile"
                  aria-label="Profile"
                  title={authName}
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-base font-semibold text-[#14213A]"
                >
                  {navAvatar ? (
                    <img src={navAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    authInitials
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmOut(true)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#B3372E] hover:text-[#8f2b23]"
                >
                  Sign out
                </button>
                {confirmOut && (
                  <ConfirmDialog
                    title="Sign out of GadgetWise?"
                    message="Are you sure you want to sign out of your account?"
                    confirmLabel="Sign Out"
                    busy={outBusy}
                    error={outError}
                    onConfirm={doSignOut}
                    onClose={() => { if (!outBusy) { setConfirmOut(false); setOutError(null); } }}
                  />
                )}
              </div>
            ) : (
              // Signed out: real sign-in / sign-up entry points.
              <div className="flex items-center gap-1">
                <Link
                  to="/login"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink2 hover:text-[#2563EB]"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* nav links (horizontally scrollable on small screens) */}
          <nav className="main-nav scroll-fade order-3 w-full overflow-x-auto lg:order-2 lg:w-auto lg:shrink-0" aria-label="Main">
            <ul className="main-nav-list flex w-full flex-wrap items-center gap-1 whitespace-normal text-base font-semibold sm:w-max sm:flex-nowrap sm:gap-2 sm:whitespace-nowrap">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <NavLink
                    to={href}
                    end={href === "/"}
                    className={({ isActive }) =>
                      `inline-block rounded-lg px-3.5 py-2 transition-colors ${
                        // gold hairline marks the route you are on
                        isActive
                          ? "border-b-2 border-[#D9A441] bg-[#FAF1DE] text-[#2563EB]"
                          : "text-ink2 hover:text-[#2563EB] hover:bg-[#F6F1E6]"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* search */}
          <form
            className="order-4 flex w-full min-w-0 items-center lg:order-3 lg:w-auto lg:min-w-0 lg:flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setShowSuggest(false);
              navigate(`/gadgets?q=${encodeURIComponent(q)}`);
            }}
          >
            <div ref={searchRef} className="relative w-full min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                placeholder="Search gadgets…"
                aria-label="Search gadgets"
                autoComplete="off"
                className="field !rounded-lg !py-2.5 !pl-10 !pr-4"
              />
              {showSuggest && (() => {
                const term = q.trim().toLowerCase();
                const matches = term.length >= 2
                  ? GW.gadgets.filter((g) => `${g.brand} ${g.model}`.toLowerCase().includes(term)).slice(0, 6)
                  : [];
                if (!matches.length) return null;
                return (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                    {matches.map((g) => (
                      <li key={g.id}>
                        <Link to={`/g/${g.id}`} onClick={() => { setQ(""); setShowSuggest(false); }}
                          className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface2">
                          <span className="min-w-0 truncate text-ink">{g.brand} {g.model}</span>
                          <span className="mono shrink-0 text-ink2">{money(g.price)}</span>
                        </Link>
                      </li>
                    ))}
                    <li className="border-t border-line">
                      <button type="submit" className="w-full px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-surface2">
                        See all results for "{q.trim()}" →
                      </button>
                    </li>
                  </ul>
                );
              })()}
            </div>
          </form>
        </div>
        {toastNode}
        {/* Prototype-style compare tray: named chips with × remove, Compare now.
            Hidden on /compare itself (you are already there). Portaled to the
            body so a fixed bar never inherits header/animation containing
            blocks. */}
        {compare.size > 0 && pathname !== "/compare" && createPortal(
          (() => {
            const items = [...compare].map((id) => GW.getGadget(id)).filter(Boolean);
            const disabled = items.length < 2;
            return (
              <div className="compare-tray" role="region" aria-label="Compare tray">
                <div className="tray-inner">
                  <span className="tray-label">COMPARE ({items.length}/4)</span>
                  <span className="tray-items">
                    {items.map((g) => (
                      <span key={g.id} className="tray-item">
                        <span className="min-w-0 truncate">{GW.displayName(g)}</span>
                        <button
                          type="button"
                          onClick={() => onCompare(g.id)}
                          aria-label={`Remove ${GW.displayName(g)} from compare`}
                        >×</button>
                      </span>
                    ))}
                  </span>
                  {disabled && <span className="tray-hint">Add at least 2 gadgets to compare</span>}
                  <Link
                    className={"tray-cta" + (disabled ? " is-disabled" : "")}
                    to="/compare"
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                  >Compare now →</Link>
                </div>
              </div>
            );
          })(),
          document.body
        )}
      </header>
      )}

      {/* keyed by route so the entrance replays on navigation */}
      <main key={pathname} className="flex-1 route-enter">
        {catalogError && needsCatalog ? (
          <CatalogErrorCard />
        ) : (
        <Suspense fallback={<div className="section text-center text-ink2">Loading…</div>}>
          <ErrorBoundary key={pathname}>
        {/* A live recovery session owns the whole app: the user must be able
            to set a new password, so no other route (and no automatic
            redirect) can take them away from the recovery page. */}
        {inRecovery ? (
          <ResetPassword />
        ) : (
        <Routes>
          <Route path="/" element={<Home compare={compare} onCompare={onCompareWithFeedback} catalogError={catalogError} catalogLoading={catalogLoading} />} />
          <Route path="/gadgets" element={<Catalog compare={compare} onCompare={onCompareWithFeedback} catalogLoading={catalogLoading} catalogError={catalogError} catalogEmpty={catalogEmpty} />} />
          <Route path="/g/:id" element={<GadgetDetail compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/compare" element={<Compare compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/recommend" element={<Quiz compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/wishlist" element={<Wishlist compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/compare-history" element={<ComparisonHistory compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/profile" element={<Profile compare={compare} onCompare={onCompareWithFeedback} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/review-history" element={<ReviewHistory />} />
          <Route path="/u/:userId" element={<PublicProfile />} />
          <Route
            path="/admin"
            element={
              !ready || !adminChecked ? (
                <section className="section"><p className="text-ink2">Checking admin access…</p></section>
              ) : isAdminUser ? (
                <Admin />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="*"
            element={
              <section className="section mx-auto max-w-[560px] text-center">
                <h1>Page not found</h1>
                <p className="mt-2 text-ink2">That address doesn&apos;t match any page on GadgetWise.</p>
                <Link to="/" className={btnPrimaryCls + " mt-5 inline-flex"}>Go home</Link>
              </section>
            }
          />
        </Routes>
        )}
          </ErrorBoundary>
        </Suspense>
        )}
      </main>

      {!isAdminRoute && (
      <footer className="bg-[#14213A]">
        <div className="mx-auto max-w-none px-6 lg:px-12 2xl:px-16 py-12">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <div>
              <div className="text-xl font-bold">
                <span className="text-white">Gadget</span>
                <span className="text-[#5B9DF0]">Wise</span>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-on-hero2">
                Compare gadgets by price, specs, ownership cost, and student ratings. Made for Filipino students.{" "}
                <span className="text-white/65">
                  Product data comes from the live Lazada marketplace. Specs the marketplace does not provide are shown
                  as unavailable rather than estimated. GadgetWise is a comparison tool, not a store.
                </span>
              </p>
            </div>
            <FooterColumn title="CATEGORIES" items={CATEGORIES} links />
            <FooterColumn title="DECIDE" items={DECIDE} links />
            <FooterColumn title="ACCOUNT" items={ACCOUNT} links />
            <FooterColumn title="THIS PROJECT" items={THIS_PROJECT} />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-on-hero2">
            <span className="flex items-center gap-2.5">
              <Logo size={16} tone="light" showWordmark={false} />
              <span>GadgetWise. A student gadget comparison tool. Not a store; no products are sold here.</span>
            </span>
            <span>Cost estimates use a fixed 24-month window so products stay comparable.</span>
          </div>
        </div>
      </footer>
      )}
      <AuthPromptHost />
    </div>
  );
}
