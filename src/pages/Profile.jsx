import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GW } from "../lib.js";
import { GadgetCard, useWishlist } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function HeartOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function Profile({ compare, onCompare }) {
  const navigate = useNavigate();
  const wish = useWishlist();
  const { user, ready, configured, signOut } = useAuth();

  useEffect(() => {
    document.title = "GadgetWise — Profile";
  }, []);

  // Real account only. In Supabase mode a signed-out visitor is sent to login;
  // demo mode (no Supabase) shows the local preview identity.
  if (configured && ready && !user) return <Navigate to="/login" replace />;

  const email = user?.email || "";
  const displayName = user?.user_metadata?.name || email || "Guest";
  const initials = (email || displayName).slice(0, 2).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const saved = GW.gadgetsByIds([...wish.ids]);
  const compareCount = readCompareHistory().length;
  const stats = [
    ["Member since", memberSince],
    ["Wishlist", String(wish.ids.size)],
    ["Comparisons run", String(compareCount)],
    ["Account", configured ? "Signed in" : "Local preview"],
  ];

  return (
    <section className="section">
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">My Account</h1>
      <p className="mt-2 text-ink2">Your profile, saved gadgets, and activity history.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* profile card */}
        <aside className="card h-fit p-6 lg:col-span-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-xl font-semibold text-[#14213A]">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-ink break-words">{displayName}</div>
              <div className="text-sm text-ink2 break-words">{email || "Not signed in"}</div>
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink2">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <Link to="/review-history" className="btn-outline flex w-full items-center justify-center gap-2">
              <DocIcon /> Review history
            </Link>
            <Link to="/comparison-history" className="btn-outline flex w-full items-center justify-center gap-2">
              <ClockIcon /> Comparison history
            </Link>
            <Link to="/wishlist" className="btn-outline flex w-full items-center justify-center gap-2">
              <HeartOutlineIcon /> Wishlist
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              <ExitIcon /> Sign out
            </button>
          </div>
        </aside>

        {/* main column */}
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-2xl font-semibold text-ink">Saved gadgets</h2>
            <Link to="/wishlist" className="font-semibold text-[#2563EB] hover:underline">
              Open wishlist
            </Link>
          </div>
          {saved.length === 0 ? (
            <div className="card mt-4 p-8 text-center">
              <p className="font-semibold text-ink">No saved gadgets yet.</p>
              <Link to="/gadgets" className="btn-primary mt-4 inline-flex">Browse gadgets</Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((g) => (
                <GadgetCard key={g.id} g={g} compare={compare} onCompare={onCompare} />
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-2xl font-semibold text-ink">Recommendation history</h2>
            <Link to="/recommend" className="font-semibold text-[#2563EB] hover:underline">
              Run a new one
            </Link>
          </div>
          {/* Recommendation runs are not persisted yet, so we show a real empty
              state instead of seeding fabricated history. */}
          <div className="card mt-4 p-8 text-center">
            <p className="font-semibold text-ink">No recommendation runs saved yet.</p>
            <p className="mt-1 text-sm text-ink2">
              Run the recommendation wizard to get scored picks. Your runs will appear here once
              recommendation history is saved to your account.
            </p>
            <Link to="/recommend" className="btn-primary mt-4 inline-flex">Find my gadget</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
