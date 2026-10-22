/**
 * Auth state for the app. Real Supabase auth only — there is NO demo or
 * localStorage fallback identity. If Supabase is not configured, authentication
 * is simply unavailable and sign-in attempts fail safely (never a fabricated
 * "logged in" state from an arbitrary email/password).
 *
 * Session restoration: reads the persisted Supabase session once on mount and
 * tracks onAuthStateChange, so a refresh does not flash the logged-out screen.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "./supabase.js";

// ---- shared auth gate -----------------------------------------------------
// One place to ask "is a signed-in user required for this action?" so every
// protected action (favorite, review, ...) routes through the same prompt
// instead of each page inventing its own gate.
let _authUser = null;
const _promptListeners = new Set();

export function setAuthUser(u) {
  _authUser = u;
}

/** Returns true when a user is signed in. Otherwise opens the sign-in prompt. */
export function requireAuth(action) {
  if (_authUser) return true;
  const payload = { action };
  _promptListeners.forEach((fn) => fn(payload));
  return false;
}

/** Host hook: renders the shared sign-in prompt for guests. */
export function useAuthPrompt() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const fn = (p) => setPrompt(p);
    _promptListeners.add(fn);
    return () => {
      _promptListeners.delete(fn);
    };
  }, []);
  return [prompt, () => setPrompt(null)];
}
// ---------------------------------------------------------------------------

const notConfigured = () => ({
  error: { message: "Sign-in is unavailable: authentication is not configured." },
});

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

  // Keep the shared gate's notion of the current user in sync.
  useEffect(() => {
    setAuthUser(user);
  }, [user]);

  useEffect(() => {
    if (!supabaseConfigured) {
      // No auth provider wired: stay signed out, treat auth as ready.
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

  // Ask the database whether this user is an admin (source of truth, not client state).
  useEffect(() => {
    if (!supabaseConfigured || !user) {
      setAdmin(false);
      return;
    }
    let cancelled = false;
    supabase
      .rpc("is_admin")
      .then(({ data }) => {
        if (!cancelled) setAdmin(data === true);
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    if (!supabaseConfigured) return notConfigured();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    if (!supabaseConfigured) return { ...notConfigured(), needsConfirm: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    return { error, needsConfirm: Boolean(data?.user && !data?.session) };
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, ready, admin, configured: supabaseConfigured, signIn, signUp, signOut };
}
