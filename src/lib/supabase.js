/**
 * Supabase client. Single init point; reads VITE_-prefixed env vars that are
 * safe to ship in the browser bundle. The service_role key is NOT here — it
 * only ever lives in serverless functions.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the app is wired to a real Supabase project. */
export const supabaseConfigured = Boolean(url && anonKey);

// ponytail: null client when unconfigured so the UI can fall back to demo mode
// instead of throwing at import time. Raise a real error only on use.
export const supabase = supabaseConfigured ? createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;
