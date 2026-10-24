import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GW } from "../lib.js";
import { useAuth } from "../lib/auth.js";
import { loadMyReviews, editReview, deleteReview } from "../lib/store.js";
import { Modal, useToast, btnPrimaryCls, btnOutlineCls, fieldLabelCls, fieldInputCls, StarPicker } from "../components/ui.jsx";

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
  const [toast, toastNode] = useToast();
  const [edit, setEdit] = useState(null); // {id, rating, body}
  const [remove, setRemove] = useState(null); // review being deleted
  const [busy, setBusy] = useState(false);

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

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.body.trim()) { toast("Review text cannot be empty", "alert"); return; }
    setBusy(true);
    const result = await editReview(edit.id, { rating: Number(edit.rating), body: edit.body.trim() });
    setBusy(false);
    if (!result.ok) { toast(result.error || "Could not save your review", "alert"); return; }
    setRows((rows) => rows.map((r) => (r.id === edit.id ? { ...r, rating: Number(edit.rating), body: edit.body.trim() } : r)));
    setEdit(null);
    toast("Review saved");
  };

  const confirmDelete = async () => {
    if (!remove) return;
    setBusy(true);
    const result = await deleteReview(remove.id);
    setBusy(false);
    if (!result.ok) { toast(result.error || "Could not delete your review", "alert"); return; }
    setRows((rows) => rows.filter((r) => r.id !== remove.id));
    setRemove(null);
    toast("Review deleted");
  };

  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2">Review history</h1>
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
          <Link to="/gadgets" className={btnPrimaryCls + " mt-4 inline-flex"}>Browse gadgets</Link>
        </div>
      )}

      {status === "ready" && rows.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {rows.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="min-w-0 text-lg font-semibold text-ink break-words">{GW.getGadget(r.gadget_id) ? GW.displayName(GW.getGadget(r.gadget_id)) : r.gadget_id}</h2>
                <span className="text-sm text-ink3">
                  {new Date(r.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
              <Stars rating={r.rating} />
              {r.body ? <p className="mt-3 text-sm text-ink2">{r.body}</p> : null}
              {r.status && r.status !== "approved" && (
                <p className="mt-2 text-xs font-semibold text-ink3">Status: {r.status}</p>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                <button type="button" className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink2 transition-colors hover:border-primary hover:text-primary"
                  onClick={() => setEdit({ id: r.id, rating: r.rating, body: r.body || "" })}>
                  Edit
                </button>
                <button type="button" className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink3 transition-colors hover:border-red-300 hover:text-red-700"
                  onClick={() => setRemove(r)}>
                  Delete
                </button>
                <Link to={`/g/${r.gadget_id}`} className="ml-auto text-sm font-semibold text-primary hover:underline">View product →</Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link to="/profile" className="font-semibold text-primary hover:text-primary-dark">← Back to profile</Link>
      </div>
      {toastNode}

      {edit && (
        <Modal
          title="Edit review"
          sub="Your rating and text can be updated. Publication state does not change when you edit."
          onClose={() => setEdit(null)}
          actions={
            <>
              <button type="button" className={btnOutlineCls} onClick={() => setEdit(null)}>Cancel</button>
              <button type="button" className={btnPrimaryCls} onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Save review"}
              </button>
            </>
          }
        >
          <div>
            <label className={fieldLabelCls} htmlFor="rv-edit-rating">Rating</label>
            <StarPicker id="rv-edit-rating" value={Number(edit.rating)} onChange={(n) => setEdit({ ...edit, rating: n })} label="Star rating" />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="rv-edit-body">Your review</label>
            <textarea id="rv-edit-body" rows="4" className={fieldInputCls} value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          </div>
        </Modal>
      )}

      {remove && (
        <Modal
          title="Delete this review?"
          sub="This removes the review from the product page and your history. It cannot be undone."
          onClose={() => setRemove(null)}
          actions={
            <>
              <button type="button" className={btnOutlineCls} onClick={() => setRemove(null)}>Keep it</button>
              <button type="button" className="rounded-lg bg-red-700 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-red-800" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Delete review"}
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-ink2">
            You are about to delete your review of <b>{GW.getGadget(remove.gadget_id) ? GW.displayName(GW.getGadget(remove.gadget_id)) : remove.gadget_id}</b>.
          </p>
        </Modal>
      )}
    </section>
  );
}

export default ReviewHistory;
