import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicProfile, loadPublicUserReviews } from "../lib/store.js";

function MiniStars({ n }) {
  return (
    <span className="text-star" aria-label={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="text-ink3">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * Public reviewer profile. Shows only public information: the reviewer's chosen
 * display name and their approved reviews. Never email, auth metadata, wishlist,
 * comparison history, or other private account data (that lives on /profile for
 * the owner only).
 */
export default function PublicProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState(null); // null = loading
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setReviews(null);
    setNotFound(false);
    getPublicProfile(userId).then((p) => {
      if (!alive) return;
      if (!p) {
        setNotFound(true);
        setReviews([]);
        return;
      }
      setProfile(p);
    });
    loadPublicUserReviews(userId).then((rows) => {
      if (alive) setReviews(rows || []);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <section className="section">
      <div className="eyebrow">Member</div>

      {notFound ? (
        <div className="card mt-6 p-8 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="mt-2 text-ink2">This member doesn't exist or the profile is unavailable.</p>
          <Link to="/gadgets" className="btn-primary mt-4 inline-flex">Browse gadgets</Link>
        </div>
      ) : (
        <>
          <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">
            {profile ? profile.display_name : "Loading…"}
          </h1>
          <p className="mt-2 text-ink2">
            {reviews
              ? `${reviews.length} review${reviews.length === 1 ? "" : "s"} in the GadgetWise community.`
              : "Public reviews by this member."}
          </p>

          {reviews === null && <p className="mt-8 text-ink2">Loading reviews…</p>}

          {reviews && reviews.length === 0 && (
            <div className="card mt-8 p-8 text-center">
              <p className="font-semibold text-ink">No public reviews yet.</p>
              <p className="mt-1 text-sm text-ink2">
                When this member's reviews are approved, they appear here.
              </p>
            </div>
          )}

          {reviews && reviews.length > 0 && (
            <div className="mt-8 space-y-4">
              {reviews.map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link to={`/g/${r.gadget_id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                      View product →
                    </Link>
                    <div className="flex items-center gap-3">
                      <MiniStars n={r.rating} />
                      {r.date && (
                        <span className="text-xs text-ink3">
                          {new Date(r.date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.text ? <p className="mt-2 text-ink2">{r.text}</p> : null}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
