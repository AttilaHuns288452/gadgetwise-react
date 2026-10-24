import { useEffect, useState } from "react";
import { loadRecommendations, deleteRecommendation, loadMyProfile, saveMyProfile, uploadAvatar, removeAvatar } from "../lib/store.js";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GW } from "../lib.js";
import { GadgetCard, useWishlist, useToast, Modal, ConfirmDialog, btnPrimaryCls, btnOutlineCls, fieldLabelCls, fieldInputCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";
import { readCompareHistory } from "./ComparisonHistory.jsx";

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
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState("loading");
  const [toast, toastNode] = useToast();
  const [profile, setProfile] = useState({ full_name: "", bio: "", avatar_url: "" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ full_name: "", bio: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [photo, setPhoto] = useState(null); // pending File
  const [preview, setPreview] = useState(null); // object URL for the pending file
  const [removePhoto, setRemovePhoto] = useState(false);

  const pickPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast("Use a PNG, JPEG, WebP or GIF image", "alert"); return; }
    if (file.size > 5 * 1024 * 1024) { toast("Image must be 5 MB or smaller", "alert"); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const dropPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    setRemovePhoto(true);
    const input = document.getElementById("pf-photo");
    if (input) input.value = "";
  };

  useEffect(() => {
    document.title = "GadgetWise — Profile";
  }, []);

  useEffect(() => {
    let alive = true;
    const uid = user?.id || null;
    if (configured && uid) {
      loadMyProfile(uid).then((p) => { if (alive && p) setProfile(p); });
    }
    return () => { alive = false; };
  }, [user, configured]);

  useEffect(() => {
    let alive = true;
    const uid = user?.id || null;
    if (!configured || !uid) {
      setRecommendations([]);
      setRecommendationStatus("ready");
      return () => { alive = false; };
    }
    setRecommendationStatus("loading");
    loadRecommendations(uid).then((rows) => {
      if (!alive) return;
      setRecommendations(rows || []);
      setRecommendationStatus("ready");
    });
    return () => { alive = false; };
  }, [user, configured]);

  // Destructive: confirm the removal and report the real result.
  const [remTarget, setRemTarget] = useState(null); // {id, title}
  const [remBusy, setRemBusy] = useState(false);
  const [remError, setRemError] = useState(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [outBusy, setOutBusy] = useState(false);
  const [outError, setOutError] = useState(null);
  const removeRecommendation = async () => {
    if (!remTarget) return;
    setRemBusy(true); setRemError(null);
    const result = await deleteRecommendation(user?.id, remTarget.id).catch((e) => ({ ok: false, error: String(e) }));
    setRemBusy(false);
    if (!result.ok) { setRemError(result.error || "Could not remove this run"); return; }
    setRecommendations((rows) => rows.filter((r) => r.id !== remTarget.id));
    setRemTarget(null);
    toast("Recommendation run removed");
  };
  const doSignOut = async () => {
    setOutBusy(true); setOutError(null);
    const res = await signOut().catch((e) => ({ error: e }));
    if (res && res.error) { setOutError("Could not sign out. Please try again."); setOutBusy(false); return; }
    setOutBusy(false); setConfirmOut(false);
    navigate("/");
  };

  const openEdit = () => {
    setDraft({ full_name: profile.full_name || displayName, bio: profile.bio || "", avatar_url: profile.avatar_url || "" });
    setPhoto(null);
    setPreview(null);
    setRemovePhoto(false);
    setEditing(true);
  };

  const saveProfile = async () => {
    const name = (draft.full_name || "").trim();
    if (!name) { toast("Display name cannot be empty", "alert"); return; }
    if (name.length > 120) { toast("Display name must be 120 characters or fewer", "alert"); return; }
    setSaving(true);
    // photo first: upload/removal is its own real operation, and a failure keeps
    // the previous working photo instead of half-saving the profile
    let avatar = draft.avatar_url || "";
    if (photo) {
      const up = await uploadAvatar(user.id, photo);
      if (!up.ok) { setSaving(false); toast(up.error || "Could not upload the photo", "alert"); return; }
      avatar = up.url;
    } else if (removePhoto) {
      const gone = await removeAvatar(user.id);
      if (!gone.ok) { setSaving(false); toast(gone.error || "Could not remove the photo", "alert"); return; }
      avatar = "";
    }
    const result = await saveMyProfile(user.id, { full_name: name, bio: draft.bio, avatar_url: avatar });
    setSaving(false);
    if (!result.ok) { toast(result.error || "Could not save your profile", "alert"); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null); setPreview(null); setRemovePhoto(false);
    setProfile({ full_name: name, bio: draft.bio, avatar_url: avatar });
    setAvatarBroken(false);
    setEditing(false);
    // keep the shared nav avatar in sync without prop drilling
    window.dispatchEvent(new Event("gw-profile-updated"));
    toast("Profile updated");
  };

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
            {profile.avatar_url && !avatarBroken ? (
              <img src={profile.avatar_url} alt="" onError={() => setAvatarBroken(true)}
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover" />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#DBEAFE] text-xl font-semibold text-[#14213A]">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-lg font-semibold text-ink break-words">{profile.full_name || displayName}</div>
              <div className="text-sm text-ink2 break-words">{email || "Not signed in"}</div>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-ink2 break-words">{profile.bio}</p>
          )}
          {user && (
            <button type="button" onClick={openEdit} className={`${btnOutlineCls} mt-4 w-full`}>
              Edit profile
            </button>
          )}

          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink2">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 space-y-2 border-t border-line pt-5">
            {toastNode}
            {remTarget && (
              <ConfirmDialog
                title="Remove this recommendation run?"
                message={<span>Permanently remove the run “{remTarget.title || "Untitled"}”? This cannot be undone.</span>}
                confirmLabel="Remove"
                danger
                busy={remBusy}
                error={remError}
                onConfirm={removeRecommendation}
                onClose={() => { if (!remBusy) { setRemTarget(null); setRemError(null); } }}
              />
            )}
            {confirmOut && (
              <ConfirmDialog
                title="Sign out of GadgetWise?"
                message="Are you sure you want to sign out of your account?"
                confirmLabel="Sign Out"
                busy={outBusy}
                error={outError}
                onConfirm={doSignOut}
                onClose={() => { if (!outBusy) { setConfirmOut(false); setOutError(null); } }}
              />
            )}
            <Link to="/review-history" className={btnOutlineCls + " flex w-full items-center justify-center gap-2"}>
              <DocIcon /> Review history
            </Link>
            <Link to="/compare-history" className={btnOutlineCls + " flex w-full items-center justify-center gap-2"}>
              <ClockIcon /> Comparison history
            </Link>
            <Link to="/wishlist" className={btnOutlineCls + " flex w-full items-center justify-center gap-2"}>
              <HeartOutlineIcon /> Wishlist
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOut(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"
            >
              <ExitIcon /> Sign out
            </button>
          </div>
        </aside>

        {/* main column */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-[#DCE7F8] bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF5FF_100%)] p-6 shadow-[0_12px_30px_rgba(31,78,121,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563EB]">Your decision desk</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Keep your shortlist moving.</h2>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-ink2">Saved gadgets, comparisons, reviews, and recommendations in one calm place.</p>
              </div>
              <Link to="/recommend" className="btn-primary shrink-0">Run a recommendation →</Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[["Saved", wish.ids.size, "/wishlist"], ["Comparisons", compareCount, "/compare-history"], ["Recommendations", recommendations.length, "#recommendation-history"]].map(([label, value, to]) => (
                <Link key={label} to={to} className="rounded-xl border border-white/80 bg-white/75 px-4 py-3 transition-transform hover:-translate-y-0.5">
                  <div className="mono text-2xl font-bold text-hero">{value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink3">{label}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
            <div className="stagger mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((g, i) => (
                <GadgetCard key={g.id} i={i} g={g} compare={compare} onCompare={onCompare} />
              ))}
            </div>
          )}

          <div id="recommendation-history" className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink3">Your trail</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">Recommendation history</h2>
            </div>
            <Link to="/recommend" className="font-semibold text-[#2563EB] hover:underline">
              Run a new one
            </Link>
          </div>
          {recommendationStatus === "loading" ? (
            <div className="card mt-4 p-8 text-center"><p className="text-ink2">Loading your recommendation history…</p></div>
          ) : recommendations.length === 0 ? (
            <div className="card mt-4 border-dashed p-8 text-center">
              <p className="font-semibold text-ink">No recommendation runs saved yet.</p>
              <p className="mt-1 text-sm text-ink2">Complete the wizard and your ranked shortlist will be saved here.</p>
              <Link to="/recommend" className="btn-primary mt-4 inline-flex">Find my gadget</Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {recommendations.map((run) => (
                <article key={run.id} className="card flex flex-wrap items-start justify-between gap-4 p-5 transition-shadow hover:shadow-[0_10px_25px_rgba(15,23,34,0.08)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{run.category} shortlist</h3>
                      <span className="chip">{run.budget_label}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink2">For {run.use_case} · {new Date(run.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
                    <p className="mt-3 text-sm text-ink3">{(run.result_titles || []).slice(0, 3).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => setRemTarget({ id: run.id, title: run.use_case })} className="shrink-0 text-sm font-semibold text-ink3 hover:text-red-700">Remove</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Modal
          title="Edit profile"
          sub="These fields appear on your public reviewer profile."
          onClose={() => setEditing(false)}
          actions={
            <>
              <button type="button" className={btnOutlineCls} onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className={btnPrimaryCls} onClick={saveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          }
        >
          <div>
            <label className={fieldLabelCls} htmlFor="pf-name">Display name</label>
            <input id="pf-name" className={fieldInputCls} value={draft.full_name} maxLength={120}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="pf-bio">Bio</label>
            <textarea id="pf-bio" rows="3" maxLength={500} className={fieldInputCls} value={draft.bio}
              placeholder="A line about what you use gadgets for"
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
            <p className="mt-1 text-xs text-ink2">Up to 500 characters. Shown on your public profile.</p>
          </div>
          <div>
            <span className={fieldLabelCls}>Profile photo</span>
            <div className="mt-2 flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="Selected preview" className="h-16 w-16 rounded-full border border-line object-cover" />
              ) : draft.avatar_url && !removePhoto ? (
                <img src={draft.avatar_url} alt="" className="h-16 w-16 rounded-full border border-line object-cover" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-full bg-[#DBEAFE] text-xl font-semibold text-[#14213A]">{initials}</div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className={`${btnOutlineCls} cursor-pointer`}>
                  Change photo
                  <input id="pf-photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pickPhoto} />
                </label>
                {(preview || (draft.avatar_url && !removePhoto)) && (
                  <button type="button" className="text-sm font-semibold text-ink3 hover:text-red-700" onClick={dropPhoto}>
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-ink2">
              PNG, JPEG, WebP or GIF up to 5 MB. {photo ? "Preview only — the photo uploads when you save." : ""}
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}
