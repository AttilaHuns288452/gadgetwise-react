import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fieldInputCls, fieldLabelCls } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.js";

function cleanRecoveryQuery() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("recovery");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // Navigation can still continue if the browser disallows URL cleanup.
  }
}

export default function PasswordRecovery() {
  const location = useLocation();
  const navigate = useNavigate();
  const { configured, requestPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState(() =>
    location.state?.recovery || new URLSearchParams(window.location.search).get("recovery") === "1"
      ? "update" : "request"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestReset(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!configured) {
      setError("Password recovery is unavailable until Supabase is configured.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) throw result.error;
      setNotice("If that address is registered, recovery instructions will be sent. Check your inbox and spam folder.");
    } catch (requestError) {
      console.error("Password recovery request failed:", requestError instanceof Error ? requestError.message : "unknown");
      setError("We couldn't request a recovery email. Check the address, Supabase email settings, and redirect URL configuration.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await updatePassword(password);
      if (result.error) throw result.error;
      cleanRecoveryQuery();
      setPassword("");
      setConfirmation("");
      setNotice("Your password has been updated.");
      setMode("done");
    } catch (updateError) {
      console.error("Password update failed:", updateError instanceof Error ? updateError.message : "unknown");
      setError("The password could not be updated. Your recovery link may have expired; request a new one and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="mx-auto max-w-md">
        <div className="eyebrow">Account security</div>
        <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">
          {mode === "update" ? "Choose a new password" : mode === "done" ? "Password updated" : "Reset your password"}
        </h1>
        <p className="mt-2 text-ink2">
          {mode === "update"
            ? "Choose a new password for your GadgetWise account."
            : mode === "done"
              ? "Your new password is saved."
              : "We'll send a recovery link if the account exists."}
        </p>

        {!configured && <p role="status" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Supabase is not configured, so account recovery is disabled.</p>}

        {mode === "request" && (
          <form onSubmit={requestReset} className="card mt-8 space-y-5 p-6 sm:p-8">
            <div>
              <label className={fieldLabelCls} htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" required autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)} className={fieldInputCls} placeholder="you@student.edu" />
            </div>
            <button type="submit" disabled={busy || !configured} className="btn-primary w-full disabled:opacity-60">
              {busy ? "Sending…" : "Send recovery link"}
            </button>
          </form>
        )}

        {mode === "update" && (
          <form onSubmit={savePassword} className="card mt-8 space-y-5 p-6 sm:p-8">
            <div>
              <label className={fieldLabelCls} htmlFor="reset-password">New password</label>
              <input id="reset-password" type="password" required minLength={8} autoComplete="new-password"
                value={password} onChange={(event) => setPassword(event.target.value)} className={fieldInputCls} />
            </div>
            <div>
              <label className={fieldLabelCls} htmlFor="reset-confirmation">Confirm new password</label>
              <input id="reset-confirmation" type="password" required minLength={8} autoComplete="new-password"
                value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={fieldInputCls} />
            </div>
            <button type="submit" disabled={busy || !configured} className="btn-primary w-full disabled:opacity-60">
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          {mode === "done" ? <Link to="/login" className="text-primary hover:underline">Continue to login →</Link> : <Link to="/login" className="text-primary hover:underline">Back to login</Link>}
          {mode !== "done" && <button type="button" onClick={() => { setMode("request"); setError(""); setNotice(""); }} className="text-primary hover:underline">Request another link</button>}
        </div>
      </div>
    </section>
  );
}
