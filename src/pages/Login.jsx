import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, configured, demoEnabled } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message || "Google sign-in could not be started.");
    } catch {
      setError("Google sign-in could not be started. Check the Supabase Google provider configuration.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err.message || "Could not sign in. Check your email and password.");
        return;
      }
      navigate("/profile");
    } catch {
      setError("Sign-in failed because the authentication service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="mx-auto max-w-md">
        <div className="eyebrow">Account</div>
        <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Welcome back</h1>
        <p className="mt-2 text-ink2">your wishlist missed you</p>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={fieldLabelCls} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu"
              className={fieldInputCls}
            />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <div className="-mt-3 text-right text-sm">
            <Link to="/reset-password" className="font-semibold text-primary hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" disabled={busy || (!configured && !demoEnabled)} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Log in"}
          </button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-ink3">
            <span className="h-px flex-1 bg-line" />
            <span>or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" disabled={busy || !configured} onClick={handleGoogleSignIn}
            className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50">
            Continue with Google
          </button>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {demoEnabled && (
            <p className="text-center text-xs text-ink2">Development demo mode is enabled. No real account is created.</p>
          )}
          {!configured && !demoEnabled && (
            <p role="status" className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Authentication is not configured. Set up Supabase to enable sign-in.</p>
          )}
          <p className="text-center text-sm text-ink2">
            New here? <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default Login;
