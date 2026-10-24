import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GW } from "../lib.js";
import { useAuth } from "../lib/auth.js";
import { loadComparisons, saveComparison } from "../lib/store.js";
import { btnPrimaryCls } from "../components/ui.jsx";

const KEY = "gw_compare_history";

export function readCompareHistory() {
  // Real history only: whatever this browser has actually compared. No seeded
  // demo sessions — a fresh account starts empty instead of showing fiction.
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const v = JSON.parse(raw);
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

function gadgetName(id, title) {
  return GW.getGadget(id) ? GW.displayName(GW.getGadget(id)) : (title || id);
}

function ComparisonHistory({ compare }) {
  const { user } = useAuth();
  const uid = user?.id || user?.email || null;
  const [history, setHistory] = useState(readCompareHistory);

  // Signed-in users: history lives in the database.
  useEffect(() => {
    let alive = true;
    if (uid) {
      loadComparisons(uid).then((rows) => {
        // an empty DB must not wipe what this browser actually compared; merge
        // both sources newest-first so either side can contribute entries
        if (!alive || !rows || !rows.length) return;
        const keyOf = (e) => [...(e.ids || [])].sort().join(",");
        setHistory((prev) => {
          const seen = new Set(rows.map(keyOf));
          return [...rows, ...prev.filter((r) => !seen.has(keyOf(r)))]
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 20);
        });
      });
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const mirroredRef = useRef(null); // last comparison set written to the DB
  useEffect(() => {
    if (!compare || compare.size === 0) return;
    const ids = [...compare];
    const key = [...ids].sort().join(",");
    const h = readCompareHistory();
    const first = h[0];
    const titles = ids.map((i) => GW.getGadget(i) ? GW.displayName(GW.getGadget(i)) : i);
    // local dedupe only against the newest entry (consecutive identical sets)
    if (!first || [...first.ids].sort().join(",") !== key) {
      const next = [{ ids, titles, ts: Date.now() }, ...h].slice(0, 20);
      localStorage.setItem(KEY, JSON.stringify(next));
      setHistory(next);
    }
    // The DB mirror needs its own guard: the run that creates the local entry
    // often has no uid yet (session still restoring), and the later uid run
    // would hit the local dedupe above and skip the write entirely.
    if (uid && mirroredRef.current !== key) {
      mirroredRef.current = key;
      saveComparison(uid, ids, titles); // mirror to DB; RLS enforces ownership
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare, uid]);

  return (
    <section className="section">
      <div className="eyebrow">Compare</div>
      <h1 className="mt-2">Comparison history</h1>
      <p className="mt-2 text-ink2">Your past compare sessions, newest first.</p>

      {history.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">No comparisons yet.</p>
          <p className="mt-2 text-ink2">Pick a few gadgets to compare and they will show up here.</p>
          <Link to="/gadgets" className={btnPrimaryCls + " mt-6 inline-flex"}>Browse gadgets</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {history.map((entry, i) => {
            const ids = Array.isArray(entry.ids) ? entry.ids : [];
            return (
              <li key={`${entry.ts}-${i}`} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                <div className="min-w-0">
                  <div className="font-semibold text-ink break-words">
                    {ids.map((id, index) => gadgetName(id, entry.titles?.[index])).join(" vs ")}
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
