import { useState } from "react";
import { GW, money } from "./lib.js";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import GadgetDetail from "./pages/GadgetDetail.jsx";
import Compare from "./pages/Compare.jsx";
import Quiz from "./pages/Quiz.jsx";
import Admin from "./pages/Admin.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import ComparisonHistory from "./pages/ComparisonHistory.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ReviewHistory from "./pages/ReviewHistory.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import { useAuth } from "./lib/auth.js";
import { loadCatalog, loadCurated } from "./lib/catalog.js";
import { Logo, btnPrimaryCls, AuthPromptHost, CatalogErrorCard } from "./components/ui.jsx";

const NAV = [
  ["/", "Home"],
  ["/gadgets", "Gadgets"],
  ["/compare", "Compare"],
  ["/recommend", "Recommendations"],
];

// footer link columns — strings verbatim from the frame spec
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
  "Not a store — nothing is sold here",
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

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 4v16" />
      <path d="M8 20h8" />
      <path d="M4 8h16" />
      <path d="M4 8l-2.5 5h5L4 8z" />
      <path d="M20 8l-2.5 5h5L20 8z" />
    </svg>
  );
}

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
  const [compare, setCompare] = useState(new Set());
  // Real catalog load. Every product page reads the GW.gadgets global, so we
  // fill it before the routes render and force one re-render when it's ready.
  const [, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
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
      else setCatalogError(catOk ? null : "catalog unavailable");
      setCatalogLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);
  const [q, setQ] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");
  // Auth and account routes need no product data — keep them reachable even if
  // the marketplace is down, so a visitor can always sign in. Only the
  // product-discovery routes show the catalog error state.
  // /admin is excluded too: the admin console must always render (its route
  // guard redirects non-admins, and its moderation/users panels work without the
  // marketplace). Only product-discovery routes are gated on the catalog.
  const needsCatalog = ![ "/", "/login", "/register", "/profile", "/wishlist", "/review-history", "/compare-history", "/admin", "/recommend", "/compare" ].includes(pathname)
    && !pathname.startsWith("/u/");
  const { user, ready, admin: isAdminUser, adminChecked, signOut } = useAuth();
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

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isAdminRoute && (
      <header className="sticky top-0 z-20 border-b border-line bg-white">
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
                {isAdminUser && (
                  <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-semibold text-[#2563EB]">
                    Admin
                  </span>
                )}
                <Link
                  to="/profile"
                  aria-label="Profile"
                  title={authName}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-base font-semibold text-[#14213A]"
                >
                  {authInitials}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink2 hover:text-[#2563EB]"
                >
                  Sign out
                </button>
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
                      `inline-block rounded-lg px-3.5 py-2 ${
                        isActive ? "bg-[#EFF6FF] text-[#2563EB]" : "text-ink2 hover:text-[#2563EB]"
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
              navigate(`/gadgets?q=${encodeURIComponent(q)}`);
            }}
          >
            <div className="relative w-full min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setShowSuggest(true); }}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
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
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface2">
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
        {compare.size > 0 && (
          <div className="border-t border-line bg-primary-wash">
            <div className="mx-auto flex max-w-none items-center gap-3 px-6 lg:px-12 2xl:px-16 py-2 text-base">
              <span className="mono font-semibold text-primary-dark">{compare.size}/4</span>
              <span className="text-ink2">in compare</span>
              <Link to="/compare" className="font-semibold text-primary hover:underline">Open compare →</Link>
            </div>
          </div>
        )}
      </header>
      )}

      <main className="flex-1">
        {catalogError && needsCatalog ? (
          <CatalogErrorCard />
        ) : (
        <Routes>
          <Route path="/" element={<Home compare={compare} onCompare={onCompare} catalogError={catalogError} catalogLoading={catalogLoading} />} />
          <Route path="/gadgets" element={<Catalog compare={compare} onCompare={onCompare} catalogLoading={catalogLoading} />} />
          <Route path="/g/:id" element={<GadgetDetail compare={compare} onCompare={onCompare} />} />
          <Route path="/compare" element={<Compare compare={compare} onCompare={onCompare} />} />
          <Route path="/recommend" element={<Quiz />} />
          <Route path="/wishlist" element={<Wishlist compare={compare} onCompare={onCompare} />} />
          <Route path="/compare-history" element={<ComparisonHistory compare={compare} onCompare={onCompare} />} />
          <Route path="/profile" element={<Profile compare={compare} onCompare={onCompare} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
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
              <span>GadgetWise — a student gadget comparison tool. Not a store; no products are sold here.</span>
            </span>
            <span>Cost estimates use a fixed 36-month window so products stay comparable.</span>
          </div>
        </div>
      </footer>
      )}
      <AuthPromptHost />
    </div>
  );
}
