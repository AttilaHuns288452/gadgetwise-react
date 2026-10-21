import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

function Register() {
  const navigate = useNavigate();
  const { signUp, configured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const { error: err, needsConfirm } = await signUp(name, email, password);
    setBusy(false);
    if (err) {
      setError(err.message || "Could not create your account. Try again.");
      return;
    }
    if (needsConfirm) {
      setNotice("Check your email to confirm your account, then sign in.");
      return;
    }
    navigate("/profile");
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Creating account…" : "Create account"}
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
          {!configured && (
            <p className="text-center text-xs text-ink2">
              Demo mode: no account is created; sign-in stays on this device.
            </p>
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
