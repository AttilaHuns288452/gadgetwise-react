import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GW } from "../lib.js";
import { useAuth } from "../lib/auth.js";
import { loadComparisonHistory, recordComparisonHistory } from "../lib/comparison-history.js";

function relDate(ts) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + " minute" + (minutes === 1 ? "" : "s") + " ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + " day" + (days === 1 ? "" : "s") + " ago";
  return new Date(ts).toLocaleDateString();
}
function gadgetName(id) {
  const gadget = GW.getGadget(id);
  return gadget ? GW.displayName(gadget) : id;
}

function ComparisonHistory({ compare }) {
  const { user, ready } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!ready) return;
      setLoading(true);
      setError("");
      try {
        if (compare && compare.size >= 2) await recordComparisonHistory([...compare]);
        const data = await loadComparisonHistory();
        if (active) setHistory(data);
      } catch (loadError) {
        console.error("Comparison history load failed:", loadError instanceof Error ? loadError.message : "unknown");
        if (active) {
          setHistory([]);
          setError("Comparison history could not be loaded or saved. Check your database configuration and try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user?.id, ready]);

  return (
    <section className="section">
      <div className="eyebrow">Compare</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Comparison history</h1>
      <p className="mt-2 text-ink2">Your recent comparison sets, newest first. Signed-in records sync across devices.</p>

      {loading && <p role="status" className="mt-8 text-sm text-ink2">Loading comparison history…</p>}
      {error && <p role="alert" className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && history.length === 0 && (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">No comparisons yet.</p>
          <p className="mt-2 text-ink2">Choose two or more gadgets and your comparison will appear here.</p>
          <Link to="/gadgets" className="btn-primary mt-6 inline-flex">Browse gadgets</Link>
        </div>
      )}
      {!loading && !error && history.length > 0 && (
        <ul className="mt-8 space-y-3">
          {history.map((entry, index) => {
            const ids = Array.isArray(entry.ids) ? entry.ids : [];
            return (
              <li key={entry.id || String(entry.ts) + "-" + index} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                <div className="min-w-0">
                  <div className="break-words font-semibold text-ink">{ids.map(gadgetName).join(" vs ")}</div>
                  <div className="text-sm text-ink3">{relDate(entry.ts)}</div>
                </div>
                <Link to={"/compare?ids=" + encodeURIComponent(ids.join(","))}
                  className="whitespace-nowrap font-semibold text-primary hover:text-primary-dark">
                  Compare again →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 text-xs text-ink3">{user ? "History is stored in your account." : "You are signed out; this history stays in this browser."}</p>
    </section>
  );
}
export default ComparisonHistory;
