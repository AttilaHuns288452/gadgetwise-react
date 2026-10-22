/**
 * Auth state for the app. Real Supabase auth when configured; otherwise falls
 * back to the demo localStorage user so the prototype stays browsable offline.
 *
 * Session restoration: subscribes to onAuthStateChange and reads the persisted
 * session once on mount, so a refresh does not flash the logged-out screen.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "./supabase.js";

const DEMO_KEY = "gw_user";
// Demo identities are opt-in and development-only; never silently trust browser storage.
const demoAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";

function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!supabaseConfigured); // demo mode is ready immediately

  useEffect(() => {
    if (!supabaseConfigured) {
      setUser(demoAuthEnabled ? readDemoUser() : null);
      setReady(true);
      return;
    }

    let cancelled = false;

    // Restore any persisted session first, then track changes.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data?.session?.user ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabaseConfigured) {
      if (!demoAuthEnabled) return { error: new Error("Authentication is unavailable because Supabase is not configured.") };
      const u = { name: "AV Demo", email };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    if (!supabaseConfigured) {
      if (!demoAuthEnabled) return { error: new Error("Registration is unavailable because Supabase is not configured."), needsConfirm: false };
      const u = { name: name.trim() || "AV Demo", email };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return { error: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    return { error, needsConfirm: Boolean(data?.user && !data?.session) };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) {
      if (demoAuthEnabled) localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, ready, configured: supabaseConfigured, demoEnabled: demoAuthEnabled, signIn, signUp, signOut };
}
