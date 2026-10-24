# Password recovery: the email OTP flow

GadgetWise recovers a password **in the same tab**: the member enters their
email, gets a 6-digit code by email, types that code in, and sets a new
password. No reset link, no new tab.

## How it works

| Step | Code | Supabase call |
| --- | --- | --- |
| 1. Enter email | `src/pages/ResetPassword.jsx` → `sendCode` | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` |
| 2. Enter code | `ResetPassword.jsx` → `verify` | `supabase.auth.verifyOtp({ email, token, type: "recovery" })` |
| 3. Set password | `ResetPassword.jsx` → `savePassword` | `supabase.auth.updateUser({ password })` |

`type: "recovery"` is what makes step 2 a password reset and not a
passwordless sign-in. The code is never validated locally: the only thing the
client decides is whether the input is 8 digits, so a wrong code is rejected
by Supabase, not by the app.

## Supabase dashboard configuration — DONE and E2E-verified 2026-10-24

Everything below is configured on the live project (custom Gmail SMTP,
recovery template carries `{{ .Token }}`, redirect allow-list set) and the
full email → 8-digit code → new password → sign-in flow was completed by a
real user on production. Kept for reference.

**This is the one part of the flow that cannot live in the repository.**
Before the template was changed, Supabase mailed a *reset link*
(`{{ .ConfirmationURL }}`) and the member received no code to type.

### 1. Recovery email template (configured 2026-10-24)

Dashboard → **Authentication → Email Templates → Reset Password**

The template body must contain the OTP variable `{{ .Token }}`:

```html
<h2>Reset your password</h2>

<p>We received a request to reset your GadgetWise password.</p>

<p>Your verification code is:</p>

<p><strong>{{ .Token }}</strong></p>

<p>This code expires in about an hour. If you didn't request this, you can
safely ignore this email.</p>
```

`{{ .Token }}` is the 6-digit one-time password. The GoTrue source confirms
the recovery mailer populates it: `RecoveryMail` puts the generated OTP in
`Token` and the token hash in `TokenHash`
(`internal/mailer/templatemailer/templatemailer.go`).

Do **not** use `{{ .TokenHash }}` — that is the hashed value, not the code.
Keeping `{{ .ConfirmationURL }}` as well is fine (it gives the member a
fallback link), but the code is what the app asks for.

The **Magic Link** template keeps `{{ .ConfirmationURL }}`; it is a
sign-in flow, not a recovery flow, and must not be changed.

### 2. Redirect URLs (configured 2026-10-24)

Dashboard → **Authentication → URL Configuration**

Add the deployed origins so `resetPasswordForEmail` accepts the redirect and
so an emailed link lands back in the app:

- `https://gadgetwise-react.vercel.app/**`
- `http://localhost:5173/**` (local development)

The app passes `redirectTo: window.location.origin + "/"` — never a URL with a
`#` fragment. Supabase appends its token to that URL, and a hash-router SPA
would put the token inside the fragment where `detectSessionInUrl` never reads
it, so the recovery session would never be established.

### 3. Email OTP length (optional, defaults are correct)

Dashboard → **Authentication → Sign In / Providers → Auth Providers → Email**

The default **Email OTP expiration** is 1 hour and the default OTP length is
6, which is what the app expects. Only change them if the project needs a
different code length — if it does, `OTP_LENGTH` in `src/lib/auth.js` must be
changed to match.

### 4. Mailer rate limit (operational)

The project uses Supabase's built-in mailer, which is limited to roughly two
emails per hour. A password recovery request therefore returns
`email rate limit exceeded` during heavy use; the app turns that into
"Too many emails requested. Wait about a minute, then try again."
For production, configure a custom SMTP server
(Dashboard → **Authentication → SMTP Settings**).

## Privacy

`resetPasswordForEmail` answers 200 whether or not the address has an account
(Supabase does this on purpose, to stop account enumeration). The app never
tells the member whether the address exists, and the address is masked
(`j•••@student.edu`) wherever it is shown after the first stage.

## Redirect safety

A recovery session is not a normal signed-in session: the member still has to
choose a new password. While one is live the app stays on the recovery page.

- `src/lib/auth.js` → `recoveryFlowActive()` is the single source of truth.
  It is true while a recovery session is live **or** while the persisted stage
  is `password`.
- The stage lives in `sessionStorage` under `gw:recovery` (per tab, gone when
  the tab closes). It holds the stage, the email, the user id and the resend
  cooldown — never a code and never a password.
- The `PASSWORD_RECOVERY` auth event is not enough on its own: after a
  refresh the auth client restores the session with `SIGNED_IN`, not
  `PASSWORD_RECOVERY`. The persisted stage is what survives the refresh.
- `src/App.jsx` renders the recovery page instead of the route table while the
  flow is active, so no route and no automatic redirect can take the member
  away from the password form.
- When the password is set, the recovery session is signed out, the stored
  state is cleared, and the member is sent to the sign-in page.
