import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { loadMyReviews } from "../lib/store.js";

function Stars({ rating }) {
  return (
    <div className="mt-1 text-star" aria-label={`Rated ${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-ink3">{"★".repeat(5 - rating)}</span>
    </div>
  );
}

function ReviewHistory() {
  const { user, configured } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready

  // Real reviews only: the signed-in user's rows from the database. Guests see
  // an honest empty state — never fabricated sample reviews.
  useEffect(() => {
    let alive = true;
    const uid = user?.id || user?.email || null;
    if (!configured || !uid) {
      setRows([]);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    loadMyReviews(uid).then((data) => {
      if (!alive) return;
      setRows(data || []);
      setStatus("ready");
    });
    return () => {
      alive = false;
    };
  }, [user, configured]);

  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Review history</h1>
      <p className="mt-2 text-ink2">
        Everything you have reviewed{status === "ready" ? ` · ${rows.length} review${rows.length === 1 ? "" : "s"}` : ""}
      </p>

      {status === "loading" && <p className="mt-8 text-ink2">Loading your reviews…</p>}

      {status === "ready" && rows.length === 0 && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-semibold text-ink">You haven't written any reviews yet.</p>
          <p className="mt-1 text-sm text-ink2">
            Open a gadget and share your experience — your reviews will appear here.
          </p>
          <Link to="/gadgets" className="btn-primary mt-4 inline-flex">Browse gadgets</Link>
        </div>
      )}

      {status === "ready" && rows.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {rows.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold text-ink break-words">{r.gadget_id}</h2>
                <span className="text-sm text-ink3">
                  {new Date(r.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
              <Stars rating={r.rating} />
              {r.body ? <p className="mt-3 text-sm text-ink2">{r.body}</p> : null}
              {r.status && r.status !== "approved" && (
                <p className="mt-2 text-xs font-semibold text-ink3">Status: {r.status}</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link to="/profile" className="font-semibold text-primary hover:text-primary-dark">← Back to profile</Link>
      </div>
    </section>
  );
}

export default ReviewHistory;
