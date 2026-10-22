/**
 * Single persistence seam. Signed-in users read/write Supabase (RLS-backed);
 * guests stay on localStorage so the prototype works offline. Every write for a
 * signed-in user is mirrored to the database and returns the real result — no
 * fake success.
 */
import { supabase, supabaseConfigured } from "./supabase.js";

const live = (userId) => Boolean(supabaseConfigured && userId);

// ---------- wishlist ----------
export async function loadWishlist(userId) {
  if (!live(userId)) return null; // caller keeps localStorage
  const { data, error } = await supabase
    .from("wishlist")
    .select("gadget_id")
    .order("created_at", { ascending: false });
  if (error) return null;
  return new Set((data || []).map((r) => r.gadget_id));
}

/** Make the DB match `ids` for this user (insert missing, delete removed). */
export async function syncWishlist(userId, ids) {
  if (!live(userId)) return { ok: true, local: true };
  const { data: existing, error: readErr } = await supabase
    .from("wishlist")
    .select("id, gadget_id");
  if (readErr) return { ok: false, error: readErr.message };
  const have = new Set((existing || []).map((r) => r.gadget_id));
  const want = new Set(ids);
  const toAdd = [...want].filter((g) => !have.has(g));
  const toDel = (existing || []).filter((r) => !want.has(r.gadget_id)).map((r) => r.id);
  if (toAdd.length) {
    const { error } = await supabase
      .from("wishlist")
      .insert(toAdd.map((g) => ({ gadget_id: g })));
    if (error) return { ok: false, error: error.message };
  }
  if (toDel.length) {
    const { error } = await supabase.from("wishlist").delete().in("id", toDel);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------- reviews ----------
export async function submitReview(userId, { gadget_id, rating, body }) {
  if (!live(userId)) return { ok: true, local: true, pending: true };
  const { error } = await supabase
    .from("reviews")
    .insert({ gadget_id, rating, body: body || null });
  if (error) return { ok: false, error: error.message };
  return { ok: true, pending: true };
}

export async function loadReviews(gadget_id) {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at")
    .eq("gadget_id", gadget_id)
    .order("created_at", { ascending: false });
  if (error) return null;
  return data || [];
}

// ---------- comparison history ----------
export async function loadComparisons(userId) {
  if (!live(userId)) return null;
  const { data, error } = await supabase
    .from("comparison_history")
    .select("id, gadget_ids, gadget_titles, created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data || []).map((r) => ({ ids: r.gadget_ids, ts: new Date(r.created_at).getTime() }));
}

export async function saveComparison(userId, ids, titles) {
  if (!live(userId)) return { ok: true, local: true };
  const { error } = await supabase
    .from("comparison_history")
    .insert({ gadget_ids: ids, gadget_titles: titles });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
