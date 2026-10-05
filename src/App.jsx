import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  "CC 116 frontend prototype",
  "Scoring formulas in the README",
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

function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </svg>
  );
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
  const [q, setQ] = useState("");
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

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
      {!isAdmin && (
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1904px] flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-12 py-3">
          {/* logo */}
          <Link to="/" className="order-1 flex min-w-0 shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white">
              <CubeIcon />
            </span>
            <span className="text-base font-bold sm:text-xl">
              <span className="text-[#111827]">Gadget</span>
              <span className="text-[#2563EB]">{" "}Wise</span>
            </span>
            <span className="hidden text-sm font-normal text-ink3 lg:inline">Smart picks for students</span>
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
            <button
              type="button"
              onClick={() => navigate("/admin")}
              title="Open the staff console"
              className="ml-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-ink2 hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Dev
            </button>
            <span className="mx-2 h-6 w-px bg-line-strong" aria-hidden="true" />
            <Link
              to="/profile"
              aria-label="Profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-semibold text-[#14213A]"
            >
              AV
            </Link>
          </div>

          {/* nav links (horizontally scrollable on small screens) */}
          <nav className="order-3 w-full overflow-x-auto lg:order-2 lg:w-auto lg:shrink-0" aria-label="Main">
            <ul className="flex w-max items-center gap-1 whitespace-nowrap text-sm font-medium">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <NavLink
                    to={href}
                    end={href === "/"}
                    className={({ isActive }) =>
                      `inline-block rounded-lg px-4 py-2 ${
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
            className="order-4 flex w-full min-w-0 items-center lg:order-3 lg:ml-auto lg:w-[22rem] xl:w-[30rem]"
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
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search gadgets, brands, categories…"
                aria-label="Search gadgets"
                className="field !rounded-lg !py-2.5 !pl-10 !pr-4"
              />
            </div>
          </form>
        </div>
        {compare.size > 0 && (
          <div className="border-t border-line bg-primary-wash">
            <div className="mx-auto flex max-w-[1904px] items-center gap-3 px-4 sm:px-6 lg:px-12 py-2 text-base">
              <span className="mono font-semibold text-primary-dark">{compare.size}/4</span>
              <span className="text-ink2">in compare</span>
              <Link to="/compare" className="font-semibold text-primary hover:underline">Open compare →</Link>
            </div>
          </div>
        )}
      </header>
      )}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home compare={compare} onCompare={onCompare} />} />
          <Route path="/gadgets" element={<Catalog compare={compare} onCompare={onCompare} />} />
          <Route path="/g/:id" element={<GadgetDetail compare={compare} onCompare={onCompare} />} />
          <Route path="/compare" element={<Compare compare={compare} onCompare={onCompare} />} />
          <Route path="/recommend" element={<Quiz />} />
          <Route path="/wishlist" element={<Wishlist compare={compare} onCompare={onCompare} />} />
          <Route path="/compare-history" element={<ComparisonHistory compare={compare} onCompare={onCompare} />} />
          <Route path="/profile" element={<Profile compare={compare} onCompare={onCompare} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/review-history" element={<ReviewHistory />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      {!isAdmin && (
      <footer className="bg-[#14213A]">
        <div className="mx-auto max-w-[1904px] px-4 sm:px-6 lg:px-12 py-12">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <div>
              <div className="text-xl font-bold">
                <span className="text-white">Gadget</span>
                <span className="text-[#5B9DF0]">{" "}Wise</span>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-on-hero2">
                Compare gadgets by price, specs, ownership cost, and student ratings. Made for Filipino students.{" "}
                <span className="text-white/45">
                  All product data in this prototype is fictional, written for demonstration. Ratings and reviews come
                  from seeded demo users.
                </span>
              </p>
            </div>
            <FooterColumn title="CATEGORIES" items={CATEGORIES} links />
            <FooterColumn title="DECIDE" items={DECIDE} links />
            <FooterColumn title="ACCOUNT" items={ACCOUNT} links />
            <FooterColumn title="THIS PROJECT" items={THIS_PROJECT} />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-on-hero2">
            <span>GadgetWise — a CC 116 frontend prototype. Not a store; no products are sold here.</span>
            <span>Estimates shown are for demonstration only.</span>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
