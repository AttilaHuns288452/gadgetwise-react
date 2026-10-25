// Real Supabase auth only — no demo or localStorage fallback identity. The
// persisted session is restored on mount so a refresh doesn't flash signed-out.
import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "./supabase.js";

// Post-auth return destination: only same-app paths are allowed so a crafted
// ?next= can never turn sign-in into an open redirect.
export function safeNext(raw) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";
}

// password recovery: one page that walks through stages; the current stage
// survives a refresh in sessionStorage (per-tab, so not localStorage)

/** Password policy. Shared by Register and the recovery flow so they cannot drift. */
export const PASSWORD_MIN = 8;
// matches Supabase's own password rule (lower + upper + digit + symbol) so the
// server never rejects what the form accepted
export function passwordPolicyError(pw) {
  if (!pw || pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
    return "Use at least one lowercase letter, one uppercase letter, one digit, and one symbol.";
  }
  return null;
}

/** Length of the recovery code Supabase mails out (Email OTP length setting). */
export const OTP_LENGTH = 8;

/** Seconds the "Resend code" button stays disabled after a send. */
export const RESEND_COOLDOWN_SECONDS = 60;

const RECOVERY_KEY = "gw:recovery";
const RECOVERY_EVENT = "gw-recovery-changed";

// A recovery session is live in this tab. Module-level (not hook state) so a
// page that mounts AFTER the PASSWORD_RECOVERY event still knows a recovery
// session exists — the link path navigates to the recovery page on that event.
let _recoveryActive = false;

// stay on the recovery page while a recovery session is live OR the password
// is still pending (that case survives a refresh: the client restores the
// session as SIGNED_IN)
export function recoveryFlowActive() {
  if (_recoveryActive) return true;
  return readRecoveryState()?.stage === "password";
}

/** Tell the rest of the app that the recovery flow changed. */
export function notifyRecoveryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RECOVERY_EVENT));
}

// end the recovery flow: drop the marker, the stage and any held OTP
export function endRecoveryFlow() {
  _recoveryActive = false;
  clearRecoveryState();
  notifyRecoveryChanged();
}

/** Persisted recovery state: { email, stage, userId?, cooldownUntil? }. */
export function readRecoveryState() {
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeRecoveryState(state) {
  try {
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage disabled: the flow still works in-memory */
  }
}

export function clearRecoveryState() {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/** "j•••@student.edu" — recognisable, not a full address on screen. */
export function maskEmail(email) {
  const s = String(email || "").trim();
  const at = s.indexOf("@");
  if (at <= 0) return s ? "•••" : "";
  const name = s.slice(0, at);
  const domain = s.slice(at + 1);
  return `${name.slice(0, 1)}${"•".repeat(Math.max(name.length - 1, 1))}@${domain}`;
}

/** Digits only, capped at `max` — what the user typed or pasted into the code box. */
export function sanitizeOtp(raw, max = OTP_LENGTH) {
  return String(raw || "").replace(/\D/g, "").slice(0, max);
}

/** Whole seconds left on a cooldown (0 once it is over). */
export function cooldownSeconds(now, until) {
  const left = Math.ceil((until - now) / 1000);
  return left > 0 ? left : 0;
}

// user id straight from the session rather than React state — the recovery
// flow needs to know right now whether a recovery session still exists
export async function liveSessionUserId() {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

// ---- shared auth gate -----------------------------------------------------
// One place to ask "is a signed-in user required for this action?" so every
// protected action (favorite, review, ...) routes through the same prompt
// instead of each page inventing its own gate.
let _authUser = null;
const _promptListeners = new Set();
// one admin lookup per user per session: product lists mount hundreds of
// useAuth() instances and each must not fire its own is_admin() RPC
// ponytail: cached for the session; a role change takes effect on reload
const _adminCache = new Map();

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

// rewrite the provider errors a user can act on, leave the rest alone. every
// auth call routes its error through here
export const friendlyAuthError = (error) => {
  if (!error) return error;
  const m = error.message || "";
  if (/rate limit|over_email_send/i.test(m)) {
    return { ...error, message: "Too many emails requested. Wait about a minute, then try again." };
  }
  return error;
};

const notConfigured = () => ({
  error: { message: "Sign-in is unavailable: authentication is not configured." },
});

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  // true once the DB admin check has resolved (or failed closed): route guards
  // must not redirect a legitimate admin while the check is still in flight.
  const [adminChecked, setAdminChecked] = useState(false);
  const [recovery, setRecovery] = useState(false);

  // Keep the shared gate's notion of the current user in sync.
  useEffect(() => {
    setAuthUser(user);
  }, [user]);

  // The recovery flag has to survive a refresh: after the code is verified the
  // auth client restores the session with SIGNED_IN, not PASSWORD_RECOVERY, so
  // the event alone cannot be the source of truth. The persisted stage is.
  useEffect(() => {
    const sync = () => setRecovery(recoveryFlowActive());
    sync();
    window.addEventListener(RECOVERY_EVENT, sync);
    return () => window.removeEventListener(RECOVERY_EVENT, sync);
  }, []);

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
      if (_event === "PASSWORD_RECOVERY") {
        // A recovery session is live in this tab. It must not be mistaken for
        // an ordinary sign-in: the user still has to choose a new password.
        _recoveryActive = true;
        setRecovery(true);
      } else if (_event === "SIGNED_OUT") {
        _recoveryActive = false;
        setRecovery(recoveryFlowActive());
      } else if (_event === "SIGNED_IN" && !_recoveryActive) {
        // An ordinary sign-in ends any recovery state: a stale recovery flag
        // would keep yanking the user back to the password form.
        setRecovery(recoveryFlowActive());
      }
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
    if (!supabaseConfigured) {
      setAdmin(false);
      setAdminChecked(true);
      return;
    }
    if (!user) {
      setAdmin(false);
      // "no user" only counts as checked once session restore has finished —
      // a cold load of /admin must not bounce a signed-in admin in that window.
      if (ready) setAdminChecked(true);
      return;
    }
    const cached = _adminCache.get(user.id);
    if (cached !== undefined) {
      setAdmin(cached);
      setAdminChecked(true);
      return;
    }
    let cancelled = false;
    setAdminChecked(false);
    supabase
      .rpc("is_admin")
      .then(({ data }) => {
        _adminCache.set(user.id, data === true);
        if (!cancelled) { setAdmin(data === true); setAdminChecked(true); }
      })
      .catch(() => {
        if (!cancelled) { setAdmin(false); setAdminChecked(true); }
      });
    return () => {
      cancelled = true;
    };
  }, [user, ready]);

  const signIn = useCallback(async (email, password) => {
    if (!supabaseConfigured) return notConfigured();
    // users paste emails with trailing whitespace; trim here so every caller
    // and every flow (sign-in, reset, sign-up) behaves the same
    const { error } = await supabase.auth.signInWithPassword({ email: String(email || "").trim(), password });
    return { error: friendlyAuthError(error) };
  }, []);

  // Google OAuth: redirects to Google, returns to the app origin where the
  // supabase client exchanges the code and onAuthStateChange fires.
  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return notConfigured();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error };
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    if (!supabaseConfigured) return { ...notConfigured(), needsConfirm: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // confirmation links must come back to THIS deployment, not the project's
      // default Site URL, or the email-confirmation flow lands on the wrong host
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin + "/",
      },
    });
    return { error: friendlyAuthError(error), needsConfirm: Boolean(data?.user && !data?.session) };
  }, []);

  // Password recovery, step 1: ask Supabase to email a recovery code.
  // The user never leaves this tab — the code arrives in the same email the
  // old reset link used to arrive in, and is entered on the next stage.
  const requestRecoveryCode = useCallback(async (email) => {
    if (!supabaseConfigured) return notConfigured();
    const clean = String(email || "").trim();
    if (!clean) return { error: { message: "Enter your email address." } };
    // The redirect target is only used if someone still follows an emailed
    // link. It must NOT carry a hash fragment: Supabase appends its token to
    // this URL, and with "#/login" in place the token lands inside the
    // fragment where detectSessionInUrl never reads it. A hash-router SPA
    // still lands on #/reset-password afterwards.
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: window.location.origin + "/",
    });
    // Supabase answers 200 for unknown addresses too (no user enumeration),
    // so a missing error is the only success signal we get.
    return { error: friendlyAuthError(error) };
  }, []);

  // Password recovery, step 2: exchange the emailed code for a recovery
  // session. type "recovery" is what makes this a password reset rather
  // than a passwordless sign-in.
  const verifyRecoveryCode = useCallback(async (email, token) => {
    if (!supabaseConfigured) return notConfigured();
    const clean = String(email || "").trim();
    const code = String(token || "").trim();
    if (!clean) return { error: { message: "Enter your email address." } };
    if (!code) return { error: { message: "Enter the 8-digit code from your email." } };
    const { data, error } = await supabase.auth.verifyOtp({
      email: clean,
      token: code,
      type: "recovery",
    });
    if (error) return { error: friendlyAuthError(error) };
    // verifyOtp with type "recovery" fires PASSWORD_RECOVERY and stores a
    // session; mark the tab as being in a recovery so no other part of the
    // app redirects the user away from the password form.
    _recoveryActive = true;
    return { error: null, user: data?.user ?? null };
  }, []);

  // Password recovery, step 3: set the new password on the recovery session.
  const setNewPassword = useCallback(async (password) => {
    if (!supabaseConfigured) return notConfigured();
    if (!password || password.length < PASSWORD_MIN) {
      return { error: { message: `Password must be at least ${PASSWORD_MIN} characters.` } };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendlyAuthError(error) };
    // The password is set: the recovery session has done its job.
    endRecoveryFlow();
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) {
      // surface the real result: a failed logout must not look like a
      // successful one. The SDK returns {error}; we used to discard it.
      const res = await supabase.auth.signOut().catch((e) => ({ error: e }));
      if (res && res.error) return { error: res.error };
    }
    setUser(null);
    // A sign-out ends any recovery session with it.
    _recoveryActive = false;
    setRecovery(recoveryFlowActive());
    return { error: null };
  }, []);

  return { user, ready, admin, adminChecked, recovery, configured: supabaseConfigured, signIn, signInWithGoogle, signUp, signOut, requestRecoveryCode, verifyRecoveryCode, setNewPassword };
}
