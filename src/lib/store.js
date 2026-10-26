// The one persistence seam: signed-in users go to Supabase (RLS-backed),
// guests to localStorage. Writes return the real result — no fake success.
import { supabase, supabaseConfigured } from "./supabase.js";

const live = (userId) => Boolean(supabaseConfigured && userId);

// wishlist
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

// reviews
export async function submitReview(userId, { gadget_id, rating, body }) {
  if (!live(userId)) return { ok: true, local: true, pending: true };
  // the RPC validates against the forbidden-word list server-side and logs
  // rejections; the DB trigger is the un-bypassable backstop behind it
  const { data, error } = await supabase.rpc("submit_review", {
    p_gadget_id: gadget_id,
    p_rating: rating ?? 5,
    p_body: body || null,
  });
  if (error) return { ok: false, error: error.message };
  return data && data.ok ? { ok: true, pending: true } : { ok: false, error: (data && data.error) || "Could not save your review." };
}

export async function loadMyReviews(userId) {
  if (!live(userId)) return null; // caller shows an empty/demo state
  const { data, error } = await supabase
    .from("reviews")
    .select("id, gadget_id, rating, body, status, created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  return data || [];
}

// Resolve public display names for a set of reviewer ids. public_profiles is a
// definer view exposing id + display_name only (never email). Graceful when the
// view is absent (pre-migration): callers fall back to a neutral "Member".
async function authorNames(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    if (error) return {};
    return Object.fromEntries((data || []).map((p) => [p.id, { name: p.display_name, avatar: p.avatar_url }]));
  } catch {
    return {};
  }
}

const toReview = (r, names) => ({
  id: r.id,
  user_id: r.user_id,
  user: names[r.user_id]?.name || "Member",
  avatar: names[r.user_id]?.avatar || null,
  text: r.body || "",
  rating: r.rating,
  date: r.created_at,
});

export async function loadReviews(gadget_id) {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, rating, body, created_at")
    .eq("gadget_id", gadget_id)
    .order("created_at", { ascending: false });
  if (error) return null;
  const rows = data || [];
  const names = await authorNames(rows.map((r) => r.user_id));
  const votes = await loadReviewVotes(rows.map((r) => r.id));
  return rows.map((r) => ({ ...toReview(r, names), votes: votes[r.id] || { up: 0, down: 0, mine: 0 } }));
}

// ---------- review votes (public like / dislike) ----------
export async function loadReviewVotes(reviewIds) {
  const ids = [...new Set((reviewIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data: { user } = {} } = await supabase.auth.getUser().catch(() => ({ data: {} }));
  const uid = user?.id || null;
  const { data, error } = await supabase
    .from("review_votes")
    .select("review_id, user_id, value")
    .in("review_id", ids);
  const out = Object.fromEntries(ids.map((id) => [id, { up: 0, down: 0, mine: 0 }]));
  if (error) return out;
  for (const v of data || []) {
    const e = out[v.review_id];
    if (!e) continue;
    if (v.value === 1) e.up += 1;
    else e.down += 1;
    if (v.user_id === uid) e.mine = v.value;
  }
  return out;
}

// value: 1 = like, -1 = dislike. Clicking the same vote again removes it.
export async function voteReview(reviewId, value) {
  const { data: { user } = {} } = await supabase.auth.getUser().catch(() => ({ data: {} }));
  if (!user) return { ok: false, error: "Sign in required" };
  const { data: existing } = await supabase
    .from("review_votes")
    .select("value")
    .eq("review_id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.value === value) {
    const { error } = await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", user.id);
    return error ? { ok: false, error: error.message } : { ok: true, value: 0 };
  }
  const { error } = await supabase
    .from("review_votes")
    .upsert({ review_id: reviewId, value, user_id: user.id }, { onConflict: "review_id,user_id" });
  return error ? { ok: false, error: error.message } : { ok: true, value };
}

// ---------- reviews: admin moderation ----------
// These hit the real `reviews` table. RLS lets any signed-in user read all
// reviews and an admin (is_admin()) update/delete any. Approve/reject writes a
// real `status` column (migration 0004) — never React-state-only.

export async function loadAllReviews() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, gadget_id, rating, body, status, created_at")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: data || [] };
}


export async function editReview(id, { rating, body }) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await supabase.rpc("edit_review_body", {
    p_id: id,
    p_rating: rating ?? 5,
    p_body: body,
  });
  if (error) return { ok: false, error: error.message };
  return data && data.ok ? { ok: true } : { ok: false, error: (data && data.error) || "Could not save your changes." };
}

export async function deleteReview(id) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// forbidden words (admin-managed moderation list)
export async function loadForbiddenWords() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("forbidden_words")
    .select("id, phrase, category, enabled, created_at, updated_at")
    .order("phrase");
  return error ? { ok: false, error: error.message } : { ok: true, rows: data || [] };
}

export async function saveForbiddenWord({ id, phrase, category, enabled }) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const payload = {
    phrase: String(phrase || "").trim(),
    category: (category || "general").trim() || "general",
    enabled: enabled !== false,
  };
  if (!payload.phrase) return { ok: false, error: "Enter a word or phrase." };
  if (payload.phrase.length > 80) return { ok: false, error: "Keep the entry under 80 characters." };
  const { data, error } = id
    ? await supabase.from("forbidden_words").update(payload).eq("id", id).select("id").single()
    : await supabase.from("forbidden_words").insert(payload).select("id").single();
  if (error) {
    return { ok: false, error: error.code === "23505" ? "That entry already exists." : error.message };
  }
  return { ok: true, id: data && data.id };
}

export async function setForbiddenWordEnabled(id, enabled) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("forbidden_words").update({ enabled: !!enabled }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteForbiddenWord(id) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("forbidden_words").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// activity log (admin read-only)
export async function loadActivityLog({ q = "", result = "", action = "", limit = 25, offset = 0 } = {}) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  let query = supabase
    .from("activity_log")
    .select("id, at, actor, action, entity_type, entity_id, result, reason, metadata", { count: "exact" })
    .order("at", { ascending: false })
    .range(offset, offset + limit - 1);
  const term = String(q || "").replace(/[,()]/g, " ").trim();
  if (term) query = query.or(`actor.ilike.%${term}%,action.ilike.%${term}%,entity_id.ilike.%${term}%`);
  if (result) query = query.eq("result", result);
  if (action) query = query.ilike("action", `%${String(action).replace(/[,()]/g, "")}%`);
  const { data, error, count } = await query;
  return error ? { ok: false, error: error.message } : { ok: true, rows: data || [], total: count || 0 };
}

// comparison history
export async function loadComparisons(userId) {
  if (!live(userId)) return null;
  const { data, error } = await supabase
    .from("comparison_history")
    .select("id, gadget_ids, gadget_titles, created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data || []).map((r) => ({
    ids: r.gadget_ids,
    titles: r.gadget_titles || [],
    ts: new Date(r.created_at).getTime(),
  }));
}

// public reviewer profiles
// A public profile shows only public info: display name + approved reviews.
// Never email, auth metadata, wishlist, or private account data.

export async function getPublicProfile(userId) {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, display_name, bio, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

/** Public reviews by one user: approved only, never pending/rejected. */
export async function loadPublicUserReviews(userId) {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_id, gadget_id, rating, body, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return null;
    // Public profiles show published reviews only. Pending reviews remain
    // visible to their author through the owner-scoped product query, not here.
    const rows = (data || []).filter((r) => r.status === "approved");
    const names = await authorNames([userId]);
    const votes = await loadReviewVotes(rows.map((r) => r.id));
    return rows.map((r) => ({ ...toReview(r, names), gadget_id: r.gadget_id, votes: votes[r.id] || { up: 0, down: 0, mine: 0 } }));
  } catch {
    return null;
  }
}

export async function saveComparison(userId, ids, titles) {
  if (!live(userId)) return { ok: true, local: true };
  const { error } = await supabase
    .from("comparison_history")
    .insert({ gadget_ids: ids, gadget_titles: titles });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// recommendation history
export async function loadRecommendations(userId) {
  if (!live(userId)) return null;
  const { data, error } = await supabase
    .from("recommendation_history")
    .select("id, category, budget_label, use_case, priorities, result_ids, result_titles, result_scores, created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  return data || [];
}

export async function saveRecommendation(userId, run) {
  if (!live(userId)) return { ok: true, local: true };
  const { error } = await supabase.from("recommendation_history").insert({
    category: run.category,
    budget_label: run.budget_label,
    use_case: run.use_case,
    priorities: run.priorities || {},
    result_ids: run.result_ids || [],
    result_titles: run.result_titles || [],
    result_scores: run.result_scores || [],
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRecommendation(userId, id) {
  if (!live(userId)) return { ok: true, local: true };
  const { error } = await supabase.from("recommendation_history").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}


// ---------- profile (user-editable public fields) ----------
export async function loadMyProfile(userId) {
  if (!live(userId)) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data || { full_name: "", bio: "", avatar_url: "" };
}

export async function saveMyProfile(userId, { full_name, bio, avatar_url }) {
  if (!live(userId)) return { ok: false, error: "Sign in required" };
  const payload = {
    full_name: String(full_name || "").slice(0, 120),
    bio: String(bio || "").slice(0, 500),
    avatar_url: String(avatar_url || "").slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- profile photo (Supabase Storage, owner-scoped) ----------
// Each user writes only under their own folder (storage policies bind
// folder[1] to auth.uid()); a fixed object name + upsert replaces the previous
// photo instead of accumulating orphaned uploads.
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(userId, file) {
  if (!live(userId)) return { ok: false, error: "Sign in required" };
  if (!AVATAR_TYPES.includes(file.type)) return { ok: false, error: "Use a PNG, JPEG, WebP or GIF image." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "Image must be 5 MB or smaller." };
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // version query defeats stale CDN/browser caches after an upsert
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}

export async function removeAvatar(userId) {
  if (!live(userId)) return { ok: false, error: "Sign in required" };
  await supabase.storage.from("avatars").remove([`${userId}/avatar`]).catch(() => {});
  const { error } = await supabase.from("profiles").update({ avatar_url: null, updated_at: new Date().toISOString() }).eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- roles (admin_users membership, DB-enforced) ----------
export async function setUserRole(userId, makeAdmin) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.rpc("admin_set_role", {
    target_user_id: userId,
    make_admin: makeAdmin,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- site settings (admin-managed public content) ----------
export async function loadSiteSettings() {
  if (!supabaseConfigured) return {};
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) return {};
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

export async function saveSiteSetting(key, value) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// admin catalog management

export async function loadCategories() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured", rows: [] };
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
  return error ? { ok: false, error: error.message, rows: [] } : { ok: true, rows: data || [] };
}

export async function saveCategory(id, { name, blurb, sort_order = 0, slug, query }) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  // slug is the app's category id (filters, product.category) and query is the
  // marketplace keyword that fills the category — both shape the public site
  const payload = {
    name,
    blurb,
    sort_order,
    query: String(query || "").trim() || null,
    ...(slug ? { slug: String(slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}),
  };
  const q = id ? supabase.from("categories").update(payload).eq("id", id)
               : supabase.from("categories").insert(payload);
  const { error } = await q;
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteCategory(id) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("categories").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function loadProducts() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured", rows: [] };
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  return error ? { ok: false, error: error.message, rows: [] } : { ok: true, rows: data || [] };
}

export async function saveProduct(id, p) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const payload = {
    brand: p.brand || "", model: p.model, category: p.category || null,
    price: p.price == null ? null : Number(p.price),
    original_price: p.original_price == null ? null : Number(p.original_price),
    image: p.image || null, description: p.description || null,
  };
  const q = id ? supabase.from("products").update(payload).eq("id", id)
               : supabase.from("products").insert(payload);
  const { error } = await q;
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteProduct(id) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.from("products").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Record a product view (insert-only; used for real analytics). */
export async function trackView(productId) {
  if (!supabaseConfigured) return { ok: false };
  await supabase.from("product_views").insert({ product_id: String(productId) });
  return { ok: true };
}

/** Real view analytics counted from product_views (top products + last-4-week trend). */
export async function loadViewStats() {
  if (!supabaseConfigured) return { ok: false, topViewed: [], weeklyViews: [0, 0, 0, 0] };
  const { data, error } = await supabase.from("product_views").select("product_id, viewed_at");
  if (error) return { ok: false, error: error.message, topViewed: [], weeklyViews: [0, 0, 0, 0] };
  const byId = {};
  const weekly = [0, 0, 0, 0]; // oldest -> newest, last 4 weeks
  const now = Date.now();
  for (const r of data || []) {
    byId[r.product_id] = (byId[r.product_id] || 0) + 1;
    const weeksAgo = Math.floor((now - new Date(r.viewed_at).getTime()) / (7 * 864e5));
    if (weeksAgo < 4) weekly[3 - weeksAgo] += 1;
  }
  const topViewed = Object.entries(byId).map(([id, views]) => ({ id, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  return { ok: true, topViewed, weeklyViews: weekly };
}


/** Admin integration status (real connection test; secrets never returned). */
export async function loadIntegrationStatus() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: "Sign in required" };
  const r = await fetch("/api/admin/integration-status", { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j?.error?.message || "Could not load integration status" };
  return { ok: true, status: j.status };
}


/** Save the Lazada API key (encrypted server-side). Admin-only. */
export async function saveIntegrationKey(value) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: "Sign in required" };
  const r = await fetch("/api/admin/integration-config", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j?.error?.message || "Could not save the key" };
  return { ok: true, message: j.message, fingerprint: j.fingerprint };
}

/** Load the integration-config status (masked). */
export async function loadIntegrationConfig() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: "Sign in required" };
  const r = await fetch("/api/admin/integration-config", { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j?.error?.message || "Could not load config" };
  return { ok: true, config: j };
}
