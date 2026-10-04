import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import GadgetDetail from "./pages/GadgetDetail.jsx";
import Compare from "./pages/Compare.jsx";
import Quiz from "./pages/Quiz.jsx";

const NAV = [
  ["/", "Home"],
  ["/gadgets", "Gadgets"],
  ["/compare", "Compare"],
  ["/recommend", "Recommendation tool"],
];

// scroll back to the top whenever the route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const navigate = useNavigate();
  const [compare, setCompare] = useState(new Set());
  const [q, setQ] = useState("");

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
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1904px] flex-wrap items-center gap-x-6 gap-y-3 px-6 lg:px-12 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">Gadget<span className="text-primary">Wise</span></span>
            <span className="hidden text-xs text-ink3 sm:inline">Smart picks for students</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm font-medium" aria-label="Main">
            {NAV.map(([href, label]) => (
              <NavLink key={href} to={href} end={href === "/"}
                className={({ isActive }) =>
                  `rounded-sm px-3 py-1.5 ${isActive ? "bg-primary-soft text-primary-dark" : "text-ink2 hover:text-primary"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/gadgets?q=${encodeURIComponent(q)}`);
            }}
          >
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search gadgets…"
              aria-label="Search gadgets"
              className="field !w-44 !py-1.5 sm:!w-56"
            />
            <button type="submit" className="btn-primary !px-3 !py-1.5">Go</button>
          </form>
        </div>
        {compare.size > 0 && (
          <div className="border-t border-line bg-primary-wash">
            <div className="mx-auto flex max-w-[1904px] items-center gap-3 px-6 lg:px-12 py-2 text-sm">
              <span className="mono font-semibold text-primary-dark">{compare.size}/4</span>
              <span className="text-ink2">in compare</span>
              <Link to="/compare" className="font-semibold text-primary hover:underline">Open compare →</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home compare={compare} onCompare={onCompare} />} />
          <Route path="/gadgets" element={<Catalog compare={compare} onCompare={onCompare} />} />
          <Route path="/g/:id" element={<GadgetDetail compare={compare} onCompare={onCompare} />} />
          <Route path="/compare" element={<Compare compare={compare} onCompare={onCompare} />} />
          <Route path="/recommend" element={<Quiz />} />
        </Routes>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1904px] gap-x-10 gap-y-8 px-6 lg:px-12 py-8 text-sm sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr]">
          <div>
            <div className="font-bold">Gadget<span className="text-primary">Wise</span></div>
            <p className="mt-2 max-w-md text-ink3">
              Transparent gadget recommendations for students. Static demo — product photos are Wikimedia
              Commons assets; specs, prices, scores and reviews are illustrative demo data.
            </p>
          </div>
          <div className="contents">
            <div>
              <div className="font-semibold text-ink2">Explore</div>
              <ul className="mt-2 space-y-1 text-ink3">
                <li><Link to="/gadgets" className="hover:text-primary">Catalog</Link></li>
                <li><Link to="/recommend" className="hover:text-primary">Recommendation tool</Link></li>
                <li><Link to="/compare" className="hover:text-primary">Compare</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-ink2">Method</div>
              <ul className="mt-2 space-y-1 text-ink3">
                <li>Performance to Cost index</li>
                <li>36-month cost-per-month window</li>
                <li>Transparent 100-point scoring</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
