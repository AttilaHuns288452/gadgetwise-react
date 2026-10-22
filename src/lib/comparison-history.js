import { supabase, supabaseConfigured } from "./supabase.js";

const STORAGE_KEY = "gw_compare_history";
const MAX_LOCAL_HISTORY = 20;

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((row) =>
      row && Array.isArray(row.ids) && typeof row.ts === "number"
    ).slice(0, MAX_LOCAL_HISTORY) : [];
  } catch {
    return [];
  }
}
function writeLocal(rows) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX_LOCAL_HISTORY))); }
  catch { /* Guests can continue comparing in memory if browser storage is unavailable. */ }
}
function normalizeIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && id.length > 0))].slice(0, 4);
}
function sameSet(a, b) {
  return [...a].sort().join("|") === [...b].sort().join("|");
}

export async function loadComparisonHistory() {
  if (supabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { data, error } = await supabase
        .from("comparison_history").select("id,gadget_ids,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(MAX_LOCAL_HISTORY);
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        ids: Array.isArray(row.gadget_ids) ? row.gadget_ids : [],
        ts: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }));
    }
  }
  return readLocal();
}

export async function recordComparisonHistory(rawIds) {
  const ids = normalizeIds(rawIds);
  if (ids.length < 2) return { skipped: true };
  if (supabaseConfigured && supabase) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const latest = await supabase.from("comparison_history").select("gadget_ids")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latest.error) throw latest.error;
      if (latest.data?.gadget_ids && sameSet(latest.data.gadget_ids, ids)) return { skipped: true };
      const saved = await supabase.from("comparison_history").insert({ user_id: userId, gadget_ids: ids });
      if (saved.error) throw saved.error;
      return { skipped: false, persisted: true };
    }
  }

  const current = readLocal();
  if (current[0]?.ids && sameSet(current[0].ids, ids)) return { skipped: true };
  writeLocal([{ ids, ts: Date.now() }, ...current]);
  return { skipped: false, persisted: false };
}
