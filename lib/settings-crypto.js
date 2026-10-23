/**
 * AES-256-GCM encryption for admin-configurable secrets (app_settings).
 *
 * The master key lives ONLY in the server env (SETTINGS_ENCRYPTION_KEY, 32
 * bytes base64). Secrets are encrypted before hitting the DB and decrypted
 * only server-side, so a DB leak alone cannot reveal a credential. Authenticated
 * (GCM) so tampering with a stored value is detected.
 */
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Runtime lookup for the Lazada API keys (server-side only), in try-order:
 *   1. admin-configured value in app_settings (decrypted)  -> source: "database"
 *   2. deployment env: LAZADA_API_KEYS (comma list), then LAZADA_API_KEY, then
 *      OMKAR_LAZADA_API_KEY                                -> source: "environment"
 * Callers walk the list and fall over to the next key when the provider answers
 * with a quota/auth rejection (429/401/403). These are separately quota-metered
 * credentials for the same product feed, so failover keeps one feed available;
 * it never disguises an exhausted account as unlimited usage.
 */
export function orderLazadaKeys(dbKey, env = process.env) {
  const out = [];
  const push = (key, source) => {
    const k = String(key || "").trim();
    if (k && !out.some((e) => e.key === k)) out.push({ key: k, source });
  };
  push(dbKey, "database");
  for (const part of String(env.LAZADA_API_KEYS || "").split(",")) push(part, "environment");
  push(env.LAZADA_API_KEY, "environment");
  push(env.OMKAR_LAZADA_API_KEY, "environment");
  return out;
}

export async function getLazadaKeys() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await admin.from("app_settings").select("ciphertext,iv,tag").eq("key", "lazada_api_key").maybeSingle();
      if (data?.ciphertext) {
        const v = decryptSecret(data);
        if (v) return orderLazadaKeys(v);
      }
    } catch {
      /* fall through to env */
    }
  }
  return orderLazadaKeys(null);
}

export async function getLazadaKey() {
  return (await getLazadaKeys())[0] || { key: "", source: "environment" };
}

function masterKey() {
  const b64 = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!b64) return null;
  try {
    const k = Buffer.from(b64, "base64");
    return k.length === 32 ? k : null;
  } catch {
    return null;
  }
}

export function encryptSecret(plain) {
  const key = masterKey();
  if (!key) return { ok: false, error: "Settings encryption is not configured (SETTINGS_ENCRYPTION_KEY missing)." };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return {
    ok: true,
    ciphertext: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret({ ciphertext, iv, tag }) {
  const key = masterKey();
  if (!key) return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(ciphertext, "base64")), d.final()]).toString("utf8");
  } catch {
    return null; // tampered / wrong key -> treat as unavailable, never throw
  }
}
