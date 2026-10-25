// GET /api/admin/integration-status. Admin-only provider status: the connection
// test is a real request, never a hardcoded success, and no secret is returned.
import { createClient } from "@supabase/supabase-js";
import { getLazadaKeys } from "../../lib/settings-crypto.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Use GET." } });
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return res.status(503).json({ error: { code: "not_configured", message: "Supabase is not configured." } });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: "unauthorized", message: "Sign in required." } });

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await asUser.auth.getUser();
    if (error || !data?.user) return res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired session." } });
    const { data: isAdmin } = await asUser.rpc("is_admin");
    if (isAdmin !== true) return res.status(403).json({ error: { code: "forbidden", message: "Admin access required." } });
  } catch {
    return res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired session." } });
  }

  // ---- honest status (no secret ever leaves the server) ----
  const keyList = await getLazadaKeys();
  const [{ key, source } = { key: "", source: "environment" }] = keyList;
  const base = process.env.LAZADA_API_BASE || "https://lazada-api.p.rapidapi.com";
  const host = new URL(base).host;
  const status = {
    provider: "Lazada marketplace (TMAPI via RapidAPI)",
    configured: Boolean(key),
    source,
    keyCount: keyList.length,
    // masked fingerprint: first 4 + last 3 chars only
    keyFingerprint: key ? `${key.slice(0, 4)}…${key.slice(-3)}` : null,
    apiHost: host,
    envVars: {
      LAZADA_API_KEY: Boolean(process.env.LAZADA_API_KEY),
      OMKAR_LAZADA_API_KEY: Boolean(process.env.OMKAR_LAZADA_API_KEY),
      LAZADA_API_BASE: Boolean(process.env.LAZADA_API_BASE),
    },
  };

  if (!key) {
    return res.status(200).json({
      status: { ...status, connection: "missing_credentials", message: "No LAZADA_API_KEY is set in the deployment environment." },
    });
  }

  // ---- real connection test: one minimal provider request ----
  try {
    const r = await fetch(`${base}/lazada/search/items?site=ph&keywords=phone&page=1`, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host, "User-Agent": "Mozilla/5.0" },
    });
    const remaining =
      r.headers.get("x-ratelimit-requests-remaining") ||
      r.headers.get("X-RateLimit-Requests-Remaining") ||
      r.headers.get("X-RateLimit-rapid-free-plans-hard-limit-Remaining");
    status.requestsRemaining = remaining ? Number(remaining) : null;
    status.lastTest = new Date().toISOString();
    if (r.status === 200) {
      const d = await r.json().catch(() => ({}));
      const items = (d.data && d.data.items) || d.products || [];
      status.connection = "ok";
      status.itemsReturned = items.length;
      status.message = `Connected. Test search returned ${items.length} items.`;
    } else if (r.status === 429) {
      status.connection = "quota_exhausted";
      status.message = "Provider returned 429 — monthly quota or rate limit reached for this key.";
    } else if (r.status === 401 || r.status === 403) {
      status.connection = "invalid_credentials";
      status.message = `Provider rejected the key (${r.status}).`;
    } else {
      status.connection = "provider_error";
      status.message = `Provider returned ${r.status}.`;
    }
  } catch {
    status.connection = "provider_error";
    status.message = "Could not reach the provider (network error).";
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ status });
}
