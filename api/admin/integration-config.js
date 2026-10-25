// GET/POST /api/admin/integration-config. Admin-only credential management:
// GET returns masked fingerprints, POST stores the key encrypted. The Lazada
// functions read it at runtime, so a new key applies without a redeploy.
import { createClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret, getLazadaKey } from "../../lib/settings-crypto.js";

async function authorize(req) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return { code: 503, error: "Supabase is not configured." };
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { code: 401, error: "Sign in required." };
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await asUser.auth.getUser();
    if (error || !data?.user) return { code: 401, error: "Invalid or expired session." };
    const { data: isAdmin } = await asUser.rpc("is_admin");
    if (isAdmin !== true) return { code: 403, error: "Admin access required." };
    return { url, serviceKey, userId: data.user.id };
  } catch {
    return { code: 401, error: "Invalid or expired session." };
  }
}

export default async function handler(req, res) {
  const ctx = await authorize(req);
  if (ctx.code) return res.status(ctx.code).json({ error: { message: ctx.error } });
  const { url, serviceKey, userId } = ctx;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (req.method === "GET") {
    const { data } = await admin.from("app_settings").select("ciphertext,iv,tag,updated_at").eq("key", "lazada_api_key").maybeSingle();
    const configured = Boolean(data?.ciphertext);
    let fingerprint = null;
    if (configured) {
      const v = decryptSecret(data);
      if (v) fingerprint = `${v.slice(0, 4)}…${v.slice(-3)}`;
    }
    return res.status(200).json({
      key: "lazada_api_key",
      configured,
      source: configured ? "database" : (process.env.LAZADA_API_KEY ? "environment" : "none"),
      fingerprint,
      updated_at: data?.updated_at || null,
    });
  }

  if (req.method === "POST") {
    const value = (req.body && req.body.value) || "";
    if (!value || value.length < 8) return res.status(400).json({ error: { message: "Provide a valid API key." } });
    const enc = encryptSecret(value);
    if (!enc.ok) return res.status(503).json({ error: { message: enc.error } });
    const { error } = await admin.from("app_settings").upsert({
      key: "lazada_api_key", ciphertext: enc.ciphertext, iv: enc.iv, tag: enc.tag,
      updated_by: userId, updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    if (error) return res.status(500).json({ error: { message: "Could not save the key." } });
    return res.status(200).json({ ok: true, message: "API key saved (encrypted). New searches use it immediately.", fingerprint: `${value.slice(0, 4)}…${value.slice(-3)}` });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: { message: "Use GET or POST." } });
}
