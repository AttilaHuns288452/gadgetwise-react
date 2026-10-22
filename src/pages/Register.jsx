import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, configured, demoEnabled } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setNotice("");
    setBusy(true);
    try {
      const { error: err, needsConfirm } = await signUp(name.trim(), email.trim(), password);
      if (err) {
        setError(err.message || "Could not create your account. Try again.");
        return;
      }
      if (needsConfirm) {
        setNotice("Check your email to confirm your account, then sign in.");
        return;
      }
      navigate("/profile");
    } catch {
      setError("Registration failed because the authentication service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="mx-auto max-w-md">
        <div className="eyebrow">Account</div>
        <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Create your account</h1>
        <p className="mt-2 text-ink2">Free for students. Your data stays yours.</p>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={fieldLabelCls} htmlFor="reg-name">Name</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={fieldInputCls}
            />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
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
            <label className={fieldLabelCls} htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <button type="submit" disabled={busy || (!configured && !demoEnabled)} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Creating account…" : "Create account"}
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
          {notice && (
            <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
              {notice}
            </p>
          )}
          {demoEnabled && (
            <p className="text-center text-xs text-ink2">Development demo mode is enabled. No real account is created.</p>
          )}
          {!configured && !demoEnabled && (
            <p role="status" className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Registration is not configured. Set up Supabase to create real accounts.</p>
          )}
          <p className="text-center text-sm text-ink2">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default Register;
