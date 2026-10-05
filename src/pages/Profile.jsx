import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../components/ui.jsx";
import { myReviews } from "./ReviewHistory.jsx";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("gw_user") || "null") || { name: "AV Demo", email: "av.demo@gadgetwise.demo" };
  } catch {
    return { name: "AV Demo", email: "av.demo@gadgetwise.demo" };
  }
}

function compareCount() {
  try {
    const v = JSON.parse(localStorage.getItem("gw_compare_history") || "[]");
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

function Profile() {
  const wish = useWishlist();
  const [user] = useState(readUser);
  const [compares, setCompares] = useState(0);
  useEffect(() => setCompares(compareCount()), []);

  const stats = [
    { label: "Wishlisted", value: wish.ids.size },
    { label: "Reviews", value: myReviews.length },
    { label: "Compare sessions", value: compares },
  ];

  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Profile</h1>

      <div className="card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
            AV
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold text-ink break-words">{user.name}</div>
            <div className="text-ink2 break-all">{user.email}</div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-line p-4">
              <dt className="text-sm text-ink3">{s.label}</dt>
              <dd className="mono mt-1 text-2xl font-semibold text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/review-history" className="btn-primary">Review history</Link>
          <Link to="/wishlist" className="btn-ghost">Wishlist</Link>
        </div>
      </div>
    </section>
  );
}

export default Profile;
