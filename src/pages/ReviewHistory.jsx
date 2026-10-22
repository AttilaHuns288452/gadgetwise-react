import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { supabase, supabaseConfigured } from "../lib/supabase.js";

function ReviewHistory() {
  const { user, ready } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!ready) return;
      if (!supabaseConfigured || !supabase || !user?.id) {
        setReviews([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const result = await supabase
        .from("reviews")
        .select("id,gadget_id,rating,body,status,created_at,gadgets(brand,model)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (result.error) {
        console.error("Review history load failed:", result.error.message);
        setError("Your review history could not be loaded. Check your connection and try again.");
        setReviews([]);
      } else {
        setReviews((result.data || []).map((row) => {
          const linked = Array.isArray(row.gadgets) ? row.gadgets[0] : row.gadgets;
          const name = linked ? linked.brand + " " + linked.model : row.gadget_id;
          return {
            id: row.id,
            gadget: name,
            rating: Number(row.rating),
            date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable",
            body: row.body,
            status: row.status,
          };
        }));
      }
      setLoading(false);
    }
    load().catch((loadError) => {
      console.error("Review history failed:", loadError instanceof Error ? loadError.message : "unknown");
      if (active) {
        setError("Your review history could not be loaded. Check your connection and try again.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [user?.id, ready]);

  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Review history</h1>
      <p className="mt-2 text-ink2">Reviews submitted from your GadgetWise account, including moderation status.</p>

      {!user && ready && (
        <div className="card mt-8 p-8">
          <p className="font-semibold text-ink">Sign in to see your review history.</p>
          <Link to="/login" className="btn-primary mt-4 inline-flex">Log in</Link>
        </div>
      )}
      {loading && <p role="status" className="mt-8 text-ink2">Loading your reviews…</p>}
      {error && <p role="alert" className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && user && reviews.length === 0 && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-semibold text-ink">No reviews submitted yet.</p>
          <p className="mt-2 text-sm text-ink2">Reviews you submit will appear here, even while they are pending moderation.</p>
          <Link to="/gadgets" className="btn-primary mt-4 inline-flex">Browse gadgets</Link>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold text-ink break-words">{review.gadget}</h2>
                <span className="text-sm text-ink3">{review.date}</span>
              </div>
              <div className="mt-1 text-star" aria-label={"Rated " + review.rating + " out of 5"}>
                {"★".repeat(review.rating)}<span className="text-ink3">{"★".repeat(5 - review.rating)}</span>
              </div>
              <p className="mt-3 text-sm text-ink2">{review.body}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink3">Status: {review.status}</p>
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
