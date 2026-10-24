import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fieldLabelCls, fieldInputCls, PasswordField, AuthLayout, btnPrimaryCls, btnOutlineCls } from "../components/ui.jsx";
import { useAuth, safeNext } from "../lib/auth.js";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { signIn, signInWithGoogle, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Your wishlist missed you."
      footer={<>New here? <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">Create an account</Link></>}
    >
      {linkError && (
        <p role="alert" className="mb-4 rounded-lg bg-[#FFF8E6] px-4 py-2.5 text-sm font-medium text-[#6B4E12]">{linkError}</p>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className={fieldLabelCls} htmlFor="login-email">Email</label>
          <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.edu" className={fieldInputCls} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className={fieldLabelCls} htmlFor="login-password">Password</label>
            {/* Recovery is its own page: email -> code -> new password, all in
                this tab. */}
            <Link to="/reset-password" className="text-xs font-semibold text-primary hover:text-primary-dark">Forgot password?</Link>
          </div>
          <PasswordField id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={busy} className={btnPrimaryCls + " w-full disabled:opacity-60"}>
          {busy ? "Signing in…" : "Log in"}
        </button>
        <div className="flex items-center gap-3 text-xs text-ink2">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <button type="button" onClick={google} className={btnOutlineCls + " flex w-full items-center justify-center gap-2.5"}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
          </svg>
          Continue with Google
        </button>
        {error && <p role="alert" className="rounded-lg bg-[#f9e9e7] px-4 py-2.5 text-sm font-medium text-[#b3372e]">{error}</p>}
        {!configured && (
          <p className="text-center text-xs text-ink2">Sign-in is unavailable: authentication is not configured for this build.</p>
        )}
      </form>
    </AuthLayout>
  );
}

export default Login;
