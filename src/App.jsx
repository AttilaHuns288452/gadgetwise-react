import { useEffect, useState } from "react";
import { Home, Catalog } from "./views.jsx";
import { Detail, Compare } from "./detail.jsx";
import Quiz from "./quiz.jsx";

function useHashRoute() {
  const [route, setRoute] = useState(() => location.hash.replace(/^#/, "") || "/");
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.replace(/^#/, "") || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

const NAV = [
  ["/", "Home"],
  ["/gadgets", "Gadgets"],
  ["/compare", "Compare"],
  ["/recommend", "Recommendation tool"],
];

export default function App() {
  const route = useHashRoute();
  const [compare, setCompare] = useState(() => new Set());
  const [q, setQ] = useState("");

  const onCompare = (id) =>
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= 4) return prev; // cap at 4, same as the prototype
      else next.add(id);
      return next;
    });

  const path = route.split("?")[0];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <a href="#/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">Gadget<span className="text-primary">Wise</span></span>
            <span className="hidden text-xs text-ink3 sm:inline">Smart picks for students</span>
          </a>
          <nav className="flex flex-wrap gap-1 text-sm font-medium" aria-label="Main">
            {NAV.map(([href, label]) => (
              <a key={href} href={`#${href}`}
                className={`rounded-sm px-3 py-1.5 ${path === href ? "bg-primary-soft text-primary-dark" : "text-ink2 hover:text-primary"}`}>
                {label}
              </a>
            ))}
          </nav>
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              location.hash = `#/gadgets?q=${encodeURIComponent(q)}`;
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
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2 text-sm">
              <span className="mono font-semibold text-primary-dark">{compare.size}/4</span>
              <span className="text-ink2">in compare</span>
              <a href="#/compare" className="font-semibold text-primary hover:underline">Open compare →</a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {path === "/" && <Home compare={compare} onCompare={onCompare} />}
        {path === "/gadgets" && <Catalog route={route} compare={compare} onCompare={onCompare} />}
        {path.startsWith("/g/") && <Detail id={decodeURIComponent(path.slice(3))} compare={compare} onCompare={onCompare} />}
        {path === "/compare" && <Compare compare={compare} onCompare={onCompare} />}
        {path === "/recommend" && <Quiz />}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-8 text-sm">
          <div>
            <div className="font-bold">Gadget<span className="text-primary">Wise</span></div>
            <p className="mt-2 max-w-md text-ink3">
              Transparent gadget recommendations for students. Static demo — product photos are Wikimedia
              Commons assets; specs, prices, scores and reviews are illustrative demo data.
            </p>
          </div>
          <div className="flex gap-10">
            <div>
              <div className="font-semibold text-ink2">Explore</div>
              <ul className="mt-2 space-y-1 text-ink3">
                <li><a href="#/gadgets" className="hover:text-primary">Catalog</a></li>
                <li><a href="#/recommend" className="hover:text-primary">Recommendation tool</a></li>
                <li><a href="#/compare" className="hover:text-primary">Compare</a></li>
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
