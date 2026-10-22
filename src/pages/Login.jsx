import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

// Only allow a same-app path as a return destination (blocks open redirects).
function safeNext(raw) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";
}

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err.message || "Could not sign in. Check your email and password.");
      return;
    }
    navigate(next);
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Log in"}
          </button>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {!configured && (
            <p className="text-center text-xs text-ink2">
              Demo mode: any email and password signs you in locally.
            </p>
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
