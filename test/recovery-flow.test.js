import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maskEmail, sanitizeOtp, cooldownSeconds,
  OTP_LENGTH, PASSWORD_MIN, RESEND_COOLDOWN_SECONDS, passwordPolicyError,
  readRecoveryState, writeRecoveryState, clearRecoveryState,
  recoveryFlowActive, endRecoveryFlow,
} from "../src/lib/auth.js";

// The emailed code is 8 digits (Supabase "Email OTP length" setting).
test("the recovery code is digits only and capped at the OTP length", () => {
  assert.equal(OTP_LENGTH, 8);
  assert.equal(sanitizeOtp("123456"), "123456");
  assert.equal(sanitizeOtp(" 12 34 56 "), "123456");
  assert.equal(sanitizeOtp("12-34-56"), "123456");
  assert.equal(sanitizeOtp("1234567890"), "12345678", "extra digits are dropped");
  assert.equal(sanitizeOtp("12a3b4c5d6"), "123456", "letters are dropped");
  assert.equal(sanitizeOtp(""), "");
  assert.equal(sanitizeOtp(null), "");
  assert.equal(sanitizeOtp(undefined), "");
  assert.equal(sanitizeOtp("123456", 4), "1234", "max length is honoured");
});

// The app's password rule must mirror Supabase's or users get a late server error.
test("password policy matches the Supabase requirement", () => {
  assert.equal(passwordPolicyError("Abcdef1!x"), null, "strong password passes");
  assert.ok(passwordPolicyError("abcdefgh1!"), "missing uppercase is rejected");
  assert.ok(passwordPolicyError("ABCDEFGH1!"), "missing lowercase is rejected");
  assert.ok(passwordPolicyError("Abcdefgh!"), "missing digit is rejected");
  assert.ok(passwordPolicyError("Abcdefg1"), "missing symbol is rejected");
  assert.ok(passwordPolicyError("Ab1!"), "too short is rejected");
});

// The recovery email must not reveal a full address on screen.
test("the destination email is masked", () => {
  assert.equal(maskEmail("juan@student.edu"), "j•••@student.edu");
  assert.equal(maskEmail("  juan@student.edu "), "j•••@student.edu");
  assert.equal(maskEmail("a@b.co"), "a•@b.co");
  assert.equal(maskEmail(""), "");
  assert.equal(maskEmail(null), "");
  // a malformed address must not leak the whole thing
  assert.equal(maskEmail("nonsense"), "•••");
  assert.doesNotMatch(maskEmail("juan.delacruz@student.edu"), /delacruz/);
});

// The resend button must stay disabled for a real cooldown, and free up after.
test("the resend cooldown counts down and expires", () => {
  const now = 1_000_000;
  const until = now + RESEND_COOLDOWN_SECONDS * 1000;
  assert.equal(cooldownSeconds(now, until), RESEND_COOLDOWN_SECONDS);
  assert.equal(cooldownSeconds(now + 1_000, until), RESEND_COOLDOWN_SECONDS - 1);
  assert.equal(cooldownSeconds(now + 59_000, until), 1);
  assert.equal(cooldownSeconds(now + 60_000, until), 0, "the cooldown is over");
  assert.equal(cooldownSeconds(now + 120_000, until), 0);
  assert.equal(cooldownSeconds(now, 0), 0, "no cooldown set");
  assert.equal(cooldownSeconds(now, now - 5_000), 0, "a cooldown in the past is over");
});

// The stage the user is on has to survive a refresh, and has to be clearable
// (a finished flow must not leave the email address behind).
test("recovery state round-trips through storage and can be cleared", () => {
  clearRecoveryState();
  assert.equal(readRecoveryState(), null);
  writeRecoveryState({ stage: "otp", email: "juan@student.edu", userId: "u1", cooldownUntil: 123 });
  const restored = readRecoveryState();
  assert.equal(restored.stage, "otp");
  assert.equal(restored.email, "juan@student.edu");
  assert.equal(restored.userId, "u1");
  assert.equal(restored.cooldownUntil, 123);
  clearRecoveryState();
  assert.equal(readRecoveryState(), null);
});

// The app must stay on the recovery page while a password is still pending,
// even after a refresh (a refresh restores the session as SIGNED_IN, not
// PASSWORD_RECOVERY, so the persisted stage is the only reliable signal).
test("the recovery flow is active while a password is still pending", () => {
  clearRecoveryState();
  assert.equal(recoveryFlowActive(), false, "no flow, no guard");

  writeRecoveryState({ stage: "otp", email: "juan@student.edu", userId: null, cooldownUntil: 0 });
  assert.equal(recoveryFlowActive(), false, "a pending code is not a recovery session yet");

  writeRecoveryState({ stage: "password", email: "juan@student.edu", userId: "u1", cooldownUntil: 0 });
  assert.equal(recoveryFlowActive(), true, "a pending password keeps the app on the recovery page");

  // ending the flow must release the guard
  endRecoveryFlow();
  assert.equal(recoveryFlowActive(), false, "the guard is released when the flow ends");
  assert.equal(readRecoveryState(), null, "the stored stage is cleared too");
});

// Register and the recovery form must enforce the same password policy.
test("the password policy is one shared minimum", () => {
  assert.equal(PASSWORD_MIN, 8);
});
