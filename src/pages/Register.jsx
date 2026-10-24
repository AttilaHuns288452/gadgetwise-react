import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fieldLabelCls, fieldInputCls, PasswordField, AuthLayout } from "../components/ui.jsx";
import { useAuth, safeNext, PASSWORD_MIN } from "../lib/auth.js";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { signUp, signInWithGoogle, configured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setError(""); setNotice("");
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message || "Could not start Google sign-in.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (password.length < PASSWORD_MIN) { setError(`Password must be at least ${PASSWORD_MIN} characters.`); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    const { error: err, needsConfirm } = await signUp(name, email.trim(), password);
    setBusy(false);
    if (err) { setError(err.message || "Could not create your account. Try again."); return; }
    if (needsConfirm) { setNotice("Check your email to confirm your account, then sign in."); return; }
    navigate(next);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for students. Your data stays yours."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className={fieldLabelCls} htmlFor="reg-name">Name</label>
          <input id="reg-name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name" className={fieldInputCls} />
        </div>
        <div>
          <label className={fieldLabelCls} htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.edu" className={fieldInputCls} />
        </div>
        <div>
          <label className={fieldLabelCls} htmlFor="reg-password">Password</label>
          <PasswordField id="reg-password" minLength={PASSWORD_MIN} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${PASSWORD_MIN} characters`} />
          <p className="mt-1.5 text-xs text-ink2">At least {PASSWORD_MIN} characters. Name, email, and password are required.</p>
        </div>
        <div>
          <label className={fieldLabelCls} htmlFor="reg-password-confirm">Confirm password</label>
          <PasswordField id="reg-password-confirm" minLength={PASSWORD_MIN} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? "Creating account…" : "Create account"}
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
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">{notice}</p>}
        {!configured && (
          <p className="text-center text-xs text-ink2">Sign-in is unavailable: authentication is not configured for this build.</p>
        )}
      </form>
    </AuthLayout>
  );
}

export default Register;
