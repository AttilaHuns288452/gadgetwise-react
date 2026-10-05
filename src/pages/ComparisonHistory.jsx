import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GW } from "../lib.js";

const KEY = "gw_compare_history";

function readHistory() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function relDate(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

function gadgetName(id) {
  return GW.getGadget(id) ? GW.displayName(GW.getGadget(id)) : id;
}

function ComparisonHistory({ compare }) {
  const [history, setHistory] = useState(readHistory);

  useEffect(() => {
    if (!compare || compare.size === 0) return;
    const ids = [...compare];
    const key = [...ids].sort().join(",");
    const h = readHistory();
    const first = h[0];
    // ponytail: dedupe only against the newest entry (consecutive identical sets)
    if (first && [...first.ids].sort().join(",") === key) return;
    const next = [{ ids, ts: Date.now() }, ...h].slice(0, 20);
    localStorage.setItem(KEY, JSON.stringify(next));
    setHistory(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="section">
      <div className="eyebrow">Compare</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Comparison history</h1>
      <p className="mt-2 text-ink2">Your past compare sessions, newest first.</p>

      {history.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">No comparisons yet.</p>
          <p className="mt-2 text-ink2">Pick a few gadgets to compare and they will show up here.</p>
          <Link to="/gadgets" className="btn-primary mt-6 inline-flex">Browse gadgets</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {history.map((entry, i) => {
            const ids = Array.isArray(entry.ids) ? entry.ids : [];
            return (
              <li key={`${entry.ts}-${i}`} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                <div className="min-w-0">
                  <div className="font-semibold text-ink break-words">
                    {ids.map(gadgetName).join(" vs ")}
                  </div>
                  <div className="text-sm text-ink3">{relDate(entry.ts)}</div>
                </div>
                <Link
                  to={`/compare?ids=${ids.join(",")}`}
                  className="font-semibold text-primary hover:text-primary-dark whitespace-nowrap"
                >
                  Compare again →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ComparisonHistory;
