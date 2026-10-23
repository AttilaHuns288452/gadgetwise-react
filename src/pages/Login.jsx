import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fieldLabelCls, fieldInputCls, AuthLayout } from "../components/ui.jsx";
import { useAuth, safeNext } from "../lib/auth.js";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { signIn, signInWithGoogle, resetPassword, setNewPassword, configured, recovery } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | forgot | done
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Supabase appends ?error=... when a recovery/OAuth link is expired or invalid
  const linkError = searchParams.get("error_description") || (searchParams.get("error") ? "This sign-in link is invalid or has expired. Request a new one." : "");

  const google = async () => {
    setError("");
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message || "Could not start Google sign-in.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) { setError(err.message || "Could not sign in. Check your email and password."); return; }
    navigate(next);
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await resetPassword(email);
    setBusy(false);
    if (err) { setError(err.message || "Could not send the reset link."); return; }
    setMode("done");
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    const { error: err } = await setNewPassword(password);
    setBusy(false);
    if (err) { setError(err.message || "Could not update the password."); return; }
    navigate("/profile");
  };

  // Recovery link followed: let the user choose a new password.
  if (recovery) {
    return (
      <AuthLayout title="Set a new password" subtitle="Choose a new password for your GadgetWise account.">
        <form onSubmit={savePassword} className="space-y-5">
          <div>
            <label className={fieldLabelCls} htmlFor="new-pw">New password</label>
            <input id="new-pw" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={fieldInputCls} />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="new-pw-confirm">Confirm new password</label>
            <input id="new-pw-confirm" type="password" required minLength={8} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" className={fieldInputCls} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={mode === "forgot" ? "Reset your password" : "Welcome back"}
      subtitle={mode === "forgot" ? "Enter your account email and we'll send you a reset link." : "Your wishlist missed you."}
      footer={mode === "forgot"
        ? <>Remembered it? <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="font-semibold text-primary hover:text-primary-dark">Back to sign in</button></>
        : <>New here? <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">Create an account</Link></>}
    >
      {linkError && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">{linkError}</p>
      )}
      {mode === "forgot" ? (
        <form onSubmit={sendReset} className="space-y-5">
          <div>
            <label className={fieldLabelCls} htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu" className={fieldInputCls} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      ) : mode === "done" ? (
        <div className="rounded-lg bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">
          Check your email — if an account exists for <b>{email}</b>, a reset link is on its way. Follow it to choose a new password.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className={fieldLabelCls} htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu" className={fieldInputCls} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={fieldLabelCls} htmlFor="login-password">Password</label>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }}
                className="text-xs font-semibold text-primary hover:text-primary-dark">Forgot password?</button>
            </div>
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className={fieldInputCls} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Log in"}
          </button>
          <div className="flex items-center gap-3 text-xs text-ink2">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" onClick={google} className="btn-ghost flex w-full items-center justify-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
            </svg>
            Continue with Google
          </button>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
          {!configured && (
            <p className="text-center text-xs text-ink2">Sign-in is unavailable: authentication is not configured for this build.</p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}

export default Login;
