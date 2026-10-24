/**
 * Password recovery, same tab, one page: email -> check inbox -> enter the
 * 6-digit code -> set a new password -> done -> sign in.
 *
 * The code is verified by Supabase (verifyOtp, type "recovery"). Nothing here
 * decides whether a code is valid, and no code is ever stored: the flow only
 * remembers WHICH stage the user is on, so a refresh does not throw them back
 * to the start.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls, PasswordField, AuthLayout } from "../components/ui.jsx";
import {
  useAuth, maskEmail, sanitizeOtp, cooldownSeconds, liveSessionUserId,
  readRecoveryState, writeRecoveryState, clearRecoveryState, notifyRecoveryChanged, endRecoveryFlow,
  OTP_LENGTH, RESEND_COOLDOWN_SECONDS, PASSWORD_MIN,
} from "../lib/auth.js";

const TITLES = {
  email: "Reset Your Password",
  sent: "Check Your Email",
  otp: "Enter Verification Code",
  password: "Create a New Password",
  done: "Password Updated Successfully",
};

function CheckIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mx-auto">
      <circle cx="12" cy="12" r="10" fill="#DBEAFE" />
      <path d="m7.5 12.5 3 3 6-6.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, ready, recovery, configured, requestRecoveryCode, verifyRecoveryCode, setNewPassword, signOut } = useAuth();

  const [stage, setStage] = useState(() => {
    const saved = readRecoveryState()?.stage;
    // A finished flow must not re-open as a success screen on the next visit.
    return saved === "done" ? "email" : saved || "email";
  });
  const [email, setEmail] = useState(() => readRecoveryState()?.email || "");
  const [cooldownUntil, setCooldownUntil] = useState(() => readRecoveryState()?.cooldownUntil || 0);
  const [recoveryUserId, setRecoveryUserId] = useState(() => readRecoveryState()?.userId || null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const bodyRef = useRef(null);
  const mountedRef = useRef(false);
  // Was this flow restored from a previous page load, or started here?
  // A just-verified code has its session on the way; a restored one may have
  // lost it, and that is the case that needs a "request a new code" message.
  const restoredRef = useRef(Boolean(readRecoveryState()?.stage));

  // ---- the flow state must survive a refresh -------------------------------
  useEffect(() => {
    if (stage === "done") {
      // Keep only the fact that it worked; no email, no code.
      writeRecoveryState({ stage: "done", email: "", userId: null, cooldownUntil: 0 });
      notifyRecoveryChanged();
      return;
    }
    writeRecoveryState({ stage, email, userId: recoveryUserId, cooldownUntil });
    // The rest of the app has to know the flow moved: reaching the password
    // stage means this tab must stay on the recovery page.
    notifyRecoveryChanged();
  }, [stage, email, recoveryUserId, cooldownUntil]);

  // A finished flow is a dead end: leaving the page clears it, so the next
  // visit starts at the start instead of showing a stale success screen.
  useEffect(() => {
    if (stage !== "done") return;
    const onLeave = () => {
      if (readRecoveryState()?.stage === "done") {
        clearRecoveryState();
        notifyRecoveryChanged();
        setStage("email");
      }
    };
    window.addEventListener("hashchange", onLeave);
    window.addEventListener("popstate", onLeave);
    return () => {
      window.removeEventListener("hashchange", onLeave);
      window.removeEventListener("popstate", onLeave);
    };
  }, [stage]);

  // ---- a recovery session that is no longer valid ----------------------------
  useEffect(() => {
    if (!ready || stage !== "password") return;
    let cancelled = false;
    // Ask the client directly: React state may not have caught up with the
    // session that verifyOtp just created.
    liveSessionUserId().then((id) => {
      if (cancelled) return;
      if (id && id === recoveryUserId) return; // the recovery session is alive
      // A just-verified code sets its session in the same tick, so only treat a
      // missing session as "expired" once the flow was restored from storage.
      if (!restoredRef.current && !id) return;
      setStage("sent");
      setCooldownUntil(0);
      setCode("");
      setNotice("Your recovery session expired. Request a new code to continue.");
    });
    return () => { cancelled = true; };
  }, [ready, stage, recoveryUserId]);

  // ---- an old-style reset link: a live recovery session, no staged flow ------
  useEffect(() => {
    if (!recovery || readRecoveryState()?.stage) return;
    setStage("password");
    setRecoveryUserId(user?.id ?? null);
  }, [recovery, user]);

  // ---- cooldown ticker -------------------------------------------------------
  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  // ---- focus the new stage's first control ----------------------------------
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    bodyRef.current?.querySelector("input, button")?.focus();
  }, [stage]);

  const secondsLeft = cooldownSeconds(now, cooldownUntil);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    const clean = email.trim();
    if (!clean) { setError("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError("Enter a valid email address."); return; }
    setBusy(true);
    const { error: err } = await requestRecoveryCode(clean);
    setBusy(false);
    if (err) { setError(err.message || "Could not send the recovery code. Try again."); return; }
    setEmail(clean);
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
    setStage("sent");
  };

  const resendCode = async () => {
    if (busy || secondsLeft > 0) return;
    setError("");
    setNotice("");
    setBusy(true);
    const { error: err } = await requestRecoveryCode(email.trim());
    setBusy(false);
    if (err) { setError(err.message || "Could not send a new code. Try again."); return; }
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
    setCode("");
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const digits = sanitizeOtp(code);
    if (digits.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    const { error: err, user: verified } = await verifyRecoveryCode(email.trim(), digits);
    setBusy(false);
    if (err) {
      setError(
        /expired|invalid/i.test(err.message || "")
          ? "That code is not valid or has expired. Check it, or request a new one."
          : err.message || "Could not verify the code. Try again."
      );
      return;
    }
    setCode(""); // the code is spent; never keep it around
    setRecoveryUserId(verified?.id ?? null);
    setStage("password");
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    const { error: err } = await setNewPassword(password);
    setBusy(false);
    if (err) { setError(err.message || "Could not update the password. Try again."); return; }
    setPassword("");
    setConfirm("");
    // The recovery session has done its job: end it so the next sign-in is a
    // real sign-in with the new password.
    await signOut();
    setStage("done");
  };

  const leaveFlow = async () => {
    if (stage === "password") await signOut();
    endRecoveryFlow();
    navigate("/login");
  };

  const masked = maskEmail(email);

  return (
    <AuthLayout
      title={TITLES[stage]}
      subtitle={
        stage === "email" ? "Enter the email you signed up with and we'll send you a recovery code."
          : stage === "sent" ? "We sent a recovery code to your email. It expires in about an hour."
            : stage === "otp" ? `Enter the ${OTP_LENGTH}-digit code we emailed to ${masked}.`
              : stage === "password" ? "Choose a new password for your GadgetWise account."
                : "Your new password is active. Sign in with it to continue."
      }
      footer={
        stage === "done"
          ? <>Already signed in elsewhere? <button type="button" onClick={leaveFlow} className="font-semibold text-primary hover:text-primary-dark">Go to sign in</button></>
          : <button type="button" onClick={leaveFlow} className="font-semibold text-primary hover:text-primary-dark">Back to sign in</button>
      }
    >
      <div ref={bodyRef}>
        {stage === "email" && (
          <form onSubmit={sendCode} noValidate className="space-y-5">
            <div>
              <label className={fieldLabelCls} htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@student.edu" className={fieldInputCls} />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? "Sending code…" : "Send recovery code"}
            </button>
            {!configured && (
              <p className="text-center text-xs text-ink2">Password recovery is unavailable: authentication is not configured for this build.</p>
            )}
          </form>
        )}

        {stage === "sent" && (
          <div className="space-y-5">
            <div className="rounded-lg bg-emerald-50 px-4 py-5 text-center">
              <CheckIcon />
              <p className="mt-3 text-[15px] font-semibold text-emerald-900">Check your inbox</p>
              <p className="mt-1 text-sm text-emerald-800">
                If an account exists for <span className="font-semibold">{masked}</span>, we&apos;ve sent a {OTP_LENGTH}-digit recovery code.
              </p>
            </div>
            {notice && <p role="status" className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">{notice}</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
            <button type="button" onClick={() => { setStage("otp"); setError(""); setNotice(""); }} className="btn-primary w-full">
              Enter verification code
            </button>
            <button type="button" onClick={() => { setStage("email"); setError(""); setNotice(""); }}
              className="w-full text-center text-sm font-semibold text-primary hover:text-primary-dark">
              Use a different email address
            </button>
          </div>
        )}

        {stage === "otp" && (
          <form onSubmit={verify} noValidate className="space-y-5">
            <div>
              <label className={fieldLabelCls} htmlFor="reset-code">Verification code</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                required
                value={code}
                aria-describedby="reset-code-help"
                aria-invalid={error ? "true" : undefined}
                onChange={(e) => setCode(sanitizeOtp(e.target.value))}
                onPaste={(e) => {
                  // paste the whole code at once, digits only
                  e.preventDefault();
                  setCode(sanitizeOtp(e.clipboardData.getData("text")));
                }}
                placeholder="······"
                className={fieldInputCls + " text-center font-mono text-2xl tracking-[0.5em]"}
              />
              <p id="reset-code-help" className="mt-1.5 text-xs text-ink2">
                {OTP_LENGTH} digits. Paste the code from the email if you like.
              </p>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? "Verifying…" : "Verify code"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={resendCode} disabled={busy || secondsLeft > 0}
                className="font-semibold text-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:text-ink3">
                {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
              </button>
              <button type="button" onClick={() => { setStage("email"); setError(""); setNotice(""); setCode(""); }}
                className="font-semibold text-ink2 hover:text-primary">
                Change email
              </button>
            </div>
          </form>
        )}

        {stage === "password" && (
          <form onSubmit={savePassword} noValidate className="space-y-5">
            <div>
              <label className={fieldLabelCls} htmlFor="new-pw">New password</label>
              <PasswordField id="new-pw" minLength={PASSWORD_MIN} autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${PASSWORD_MIN} characters`} />
              <p className="mt-1.5 text-xs text-ink2">At least {PASSWORD_MIN} characters.</p>
            </div>
            <div>
              <label className={fieldLabelCls} htmlFor="new-pw-confirm">Confirm new password</label>
              <PasswordField id="new-pw-confirm" minLength={PASSWORD_MIN} autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat it" />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        {stage === "done" && (
          <div className="space-y-5">
            <div className="rounded-lg bg-emerald-50 px-4 py-5 text-center">
              <CheckIcon />
              <p className="mt-3 text-[15px] font-semibold text-emerald-900">Your password has been updated</p>
              <p className="mt-1 text-sm text-emerald-800">Sign in with your new password to get back to GadgetWise.</p>
            </div>
            <button type="button" onClick={leaveFlow} className="btn-primary w-full">
              Continue to sign in
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
