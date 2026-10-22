import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GW } from "../lib.js";
import { GadgetCard, useWishlist } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";
import { supabase, supabaseConfigured } from "../lib/supabase.js";

function initials(name) {
  return String(name || "G").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "G";
}
function dateLabel(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export default function Profile({ compare, onCompare }) {
  const navigate = useNavigate();
  const wish = useWishlist();
  const { user, ready, configured, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState({ reviews: 0, comparisons: 0, recommendations: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const name = profile?.display_name || user?.user_metadata?.full_name || user?.name || user?.email?.split("@")[0] || "Guest";
  const email = user?.email || "";
  const since = dateLabel(profile?.created_at || user?.created_at);
  const saved = useMemo(() => GW.gadgetsByIds([...wish.ids]), [wish.ids, GW.gadgets.length]);

  useEffect(() => {
    document.title = "GadgetWise — Profile";
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!ready) return;
      if (!configured || !supabase || !user?.id) {
        setProfile(null);
        setActivity({ reviews: 0, comparisons: 0, recommendations: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const results = await Promise.all([
        supabase.from("profiles").select("display_name,created_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("comparison_history").select("id,gadget_ids,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_recommendations").select("id,input,result_gadget_ids,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!active) return;
      const errors = results.filter((result) => result.error);
      if (errors.length) {
        console.error("Profile activity query failed:", errors.map((result) => result.error.message).join("; "));
        setError("Some account activity could not be loaded. Check the database migrations and access policies.");
      }
      if (!results[0].error) setProfile(results[0].data || null);
      setActivity({
        reviews: results[1].error ? 0 : (results[1].count || 0),
        comparisons: results[2].error ? 0 : (results[2].data || []).length,
        recommendations: results[3].error ? [] : (results[3].data || []),
      });
      setLoading(false);
    }
    load().catch((loadError) => {
      console.error("Profile load failed:", loadError instanceof Error ? loadError.message : "unknown");
      if (active) {
        setError("Your account activity could not be loaded. Please try again.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [user?.id, ready, configured]);

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const result = await signOut();
      if (result?.error) {
        setSignOutError("Sign-out failed. Check your connection and try again.");
        return;
      }
      navigate("/login");
    } catch {
      setSignOutError("Sign-out failed. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const stats = [
    ["Member since", user ? since : "Signed out"],
    ["Reviews written", String(activity.reviews)],
    ["Comparisons run", String(activity.comparisons)],
    ["Wishlist", String(wish.ids.size)],
  ];

  return (
    <section className="section">
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">My Account</h1>
      <p className="mt-2 text-ink2">Your profile, saved gadgets, and activity history.</p>

      {!ready && <p role="status" className="mt-5 text-sm text-ink2">Checking your account…</p>}
      {ready && !user && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-ink">You are browsing as a guest.</p>
            <p className="mt-1 text-sm text-ink2">Sign in to save your wishlist and activity across devices.</p>
          </div>
          <Link to="/login" className="btn-primary inline-flex">Log in</Link>
        </div>
      )}
      {error && <p role="alert" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}
      {signOutError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{signOutError}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <aside className="card h-fit p-6 lg:col-span-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-xl font-semibold text-[#14213A]">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <div className="break-words text-lg font-semibold text-ink">{name}</div>
              {email && <div className="break-words text-sm text-ink2">{email}</div>}
            </div>
          </div>
          <p className="mt-3 text-sm text-ink3">{user ? "GadgetWise account" : "Guest session"}</p>

          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink2">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <Link to="/review-history" className="btn-outline flex w-full items-center justify-center gap-2">Review history</Link>
            <Link to="/compare-history" className="btn-outline flex w-full items-center justify-center gap-2">Comparison history</Link>
            <Link to="/wishlist" className="btn-outline flex w-full items-center justify-center gap-2">Wishlist</Link>
            {user && (
              <button type="button" disabled={signingOut} onClick={handleSignOut}
                className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline disabled:opacity-50">
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
        </aside>

        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-2xl font-semibold text-ink">Saved gadgets</h2>
            <Link to="/wishlist" className="font-semibold text-[#2563EB] hover:underline">Open wishlist</Link>
          </div>
          {saved.length === 0 ? (
            <div className="card mt-4 p-8 text-center">
              <p className="font-semibold text-ink">No saved gadgets yet.</p>
              <p className="mt-2 text-sm text-ink2">Add a gadget to the wishlist to see it here.</p>
              <Link to="/gadgets" className="btn-primary mt-4 inline-flex">Browse gadgets</Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((g) => <GadgetCard key={g.id} g={g} compare={compare} onCompare={onCompare} />)}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-2xl font-semibold text-ink">Recommendation history</h2>
            <Link to="/recommend" className="font-semibold text-[#2563EB] hover:underline">Run a new one</Link>
          </div>
          {loading && <p role="status" className="mt-4 text-sm text-ink2">Loading account activity…</p>}
          {!loading && activity.recommendations.length === 0 && (
            <div className="card mt-4 p-6">
              <p className="font-semibold text-ink">No saved recommendations yet.</p>
              <p className="mt-1 text-sm text-ink2">Recommendations will appear here after the app saves your result history.</p>
            </div>
          )}
          {!loading && activity.recommendations.length > 0 && (
            <ul className="mt-4 space-y-3">
              {activity.recommendations.map((entry) => {
                const ids = Array.isArray(entry.result_gadget_ids) ? entry.result_gadget_ids : [];
                const top = ids[0] ? GW.getGadget(ids[0]) : null;
                const when = entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-PH") : "";
                return (
                  <li key={entry.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink break-words">{top ? GW.displayName(top) : "Saved recommendation"}</div>
                      <div className="text-sm text-ink3">{when} · {ids.length} result{ids.length === 1 ? "" : "s"}</div>
                    </div>
                    {top && <Link to={"/g/" + top.id} className="btn-outline px-4 py-2 text-sm">View top pick</Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
